// Mock AWS SDK
const mockSend = jest.fn();
jest.mock('@aws-sdk/client-s3', () => ({
    S3Client: jest.fn(() => ({
        send: mockSend
    })),
    GetObjectCommand: jest.fn((params) => params),
    PutObjectCommand: jest.fn((params) => params)
}));

// Mock Sharp
const mockToBuffer = jest.fn();
const mockWebp = jest.fn(() => ({ toBuffer: mockToBuffer }));
const mockResize = jest.fn(() => ({ webp: mockWebp }));
const mockMetadata = jest.fn();

const mockSharpInstance = {
    metadata: mockMetadata,
    resize: mockResize,
    webp: mockWebp
};

jest.mock('sharp', () => jest.fn(() => mockSharpInstance));

const { handler } = require('./index');

describe('Lambda Image Converter', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Default mock implementations
        mockMetadata.mockResolvedValue({
            width: 800,
            height: 600,
            format: 'jpeg'
        });
        
        mockToBuffer.mockResolvedValue(Buffer.from('webp-data'));
        
        // Mock S3 responses
        mockSend.mockImplementation((command) => {
            if (command.Bucket && command.Key && !command.Body) {
                // GetObjectCommand
                return Promise.resolve({
                    Body: createMockStream(Buffer.from('jpeg-data')),
                    ContentLength: 1000
                });
            }
            // PutObjectCommand
            return Promise.resolve({});
        });
    });

    test('should process SQS event containing S3 event and convert image to WebP', async () => {
        const event = {
            Records: [{
                body: JSON.stringify({
                    Records: [{
                        s3: {
                            bucket: { name: 'test-bucket' },
                            object: { key: 'images/test.jpg' }
                        }
                    }]
                })
            }]
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(200);
        expect(mockSend).toHaveBeenCalledTimes(2); // GetObject + PutObject
        const sharp = require('sharp');
        expect(sharp).toHaveBeenCalledWith(expect.any(Buffer));
        expect(mockWebp).toHaveBeenCalledWith({ quality: 85 });
    });

    test('should skip already processed files', async () => {
        const event = {
            Records: [{
                body: JSON.stringify({
                    Records: [{
                        s3: {
                            bucket: { name: 'test-bucket' },
                            object: { key: 'images/test.webp' }
                        }
                    }]
                })
            }]
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(200);
        expect(mockSend).not.toHaveBeenCalled();
        const sharp = require('sharp');
        expect(sharp).not.toHaveBeenCalled();
    });

    test('should resize large images', async () => {
        // Mock large image
        mockMetadata.mockResolvedValue({
            width: 2000,
            height: 1500,
            format: 'jpeg'
        });

        const event = {
            Records: [{
                body: JSON.stringify({
                    Records: [{
                        s3: {
                            bucket: { name: 'test-bucket' },
                            object: { key: 'images/large.jpg' }
                        }
                    }]
                })
            }]
        };

        await handler(event);

        expect(mockResize).toHaveBeenCalledWith(1000, null, {
            withoutEnlargement: true,
            fit: 'inside'
        });
    });

    test('should not resize small images', async () => {
        // Mock small image
        mockMetadata.mockResolvedValue({
            width: 500,
            height: 400,
            format: 'jpeg'
        });

        const event = {
            Records: [{
                body: JSON.stringify({
                    Records: [{
                        s3: {
                            bucket: { name: 'test-bucket' },
                            object: { key: 'images/small.jpg' }
                        }
                    }]
                })
            }]
        };

        await handler(event);

        expect(mockResize).not.toHaveBeenCalled();
    });

    test('should handle URL-encoded keys', async () => {
        const event = {
            Records: [{
                body: JSON.stringify({
                    Records: [{
                        s3: {
                            bucket: { name: 'test-bucket' },
                            object: { key: 'images/test%20file.jpg' }
                        }
                    }]
                })
            }]
        };

        await handler(event);

        // Should decode the key properly
        expect(mockSend).toHaveBeenCalledWith(
            expect.objectContaining({
                Key: 'images/test file.jpg'
            })
        );
    });

    test('should generate correct processed key', async () => {
        const event = {
            Records: [{
                body: JSON.stringify({
                    Records: [{
                        s3: {
                            bucket: { name: 'test-bucket' },
                            object: { key: 'images/subfolder/test.jpg' }
                        }
                    }]
                })
            }]
        };

        await handler(event);

        // Check PutObject was called with correct processed key
        const putObjectCall = mockSend.mock.calls.find(call => 
            call[0].Body && call[0].ContentType === 'image/webp'
        );
        
        expect(putObjectCall[0].Key).toBe('images/subfolder/test.webp');
    });

    test('should continue processing other images if one fails', async () => {
        const event = {
            Records: [{
                body: JSON.stringify({
                    Records: [
                        {
                            s3: {
                                bucket: { name: 'test-bucket' },
                                object: { key: 'images/good.jpg' }
                            }
                        },
                        {
                            s3: {
                                bucket: { name: 'test-bucket' },
                                object: { key: 'images/bad.jpg' }
                            }
                        }
                    ]
                })
            }]
        };

        // Make the second image fail
        let callCount = 0;
        mockSend.mockImplementation((command) => {
            callCount++;
            if (callCount <= 2) {
                // First image succeeds (GetObject + PutObject)
                if (command.Bucket && command.Key && !command.Body) {
                    return Promise.resolve({
                        Body: createMockStream(Buffer.from('jpeg-data')),
                        ContentLength: 1000
                    });
                }
                return Promise.resolve({});
            } else {
                // Second image fails
                throw new Error('S3 error');
            }
        });

        const result = await handler(event);

        expect(result.statusCode).toBe(200);
        // Should still process the good image
        const sharp = require('sharp');
        expect(sharp).toHaveBeenCalled();
    });

    test('should handle multiple SQS records with S3 events', async () => {
        const event = {
            Records: [
                {
                    body: JSON.stringify({
                        Records: [{
                            s3: {
                                bucket: { name: 'test-bucket' },
                                object: { key: 'images/test1.jpg' }
                            }
                        }]
                    })
                },
                {
                    body: JSON.stringify({
                        Records: [{
                            s3: {
                                bucket: { name: 'test-bucket' },
                                object: { key: 'images/test2.png' }
                            }
                        }]
                    })
                }
            ]
        };

        await handler(event);

        expect(mockSend).toHaveBeenCalledTimes(4); // 2 GetObject + 2 PutObject
        const sharp = require('sharp');
        expect(sharp).toHaveBeenCalledTimes(2);
    });
});

// Helper function to create a mock readable stream
function createMockStream(buffer) {
    const chunks = [buffer];
    let index = 0;
    
    return {
        [Symbol.asyncIterator]: async function* () {
            while (index < chunks.length) {
                yield chunks[index++];
            }
        }
    };
}
