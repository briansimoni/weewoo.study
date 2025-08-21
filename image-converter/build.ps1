# PowerShell script to build the image converter Lambda function

Write-Host "Building image converter Lambda function..." -ForegroundColor Green

# Change to the image-converter directory
Set-Location $PSScriptRoot

# Clean existing node_modules to ensure fresh install
Write-Host "Cleaning existing node_modules..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item "node_modules" -Recurse -Force
}

# Install dependencies using Docker with Linux runtime
Write-Host "Installing dependencies using Docker (Linux runtime)..." -ForegroundColor Yellow
docker run --rm -v ${PWD}:/app -w /app node:22 npm install --production

# Create deployment package
Write-Host "Creating deployment package..." -ForegroundColor Yellow
if (Test-Path "image-converter-lambda.zip") {
    Remove-Item "image-converter-lambda.zip"
}

# Verify Sharp was installed for correct platform
Write-Host "Verifying Sharp installation..." -ForegroundColor Yellow
$sharpPath = "node_modules/sharp"
if (Test-Path $sharpPath) {
    Write-Host "Sharp installed successfully for Lambda" -ForegroundColor Green
} else {
    Write-Host "Warning: Sharp not found in node_modules" -ForegroundColor Red
}

# Create zip file using Docker (consistent with Linux Lambda environment)
Write-Host "Creating zip archive using Docker..." -ForegroundColor Yellow
docker run --rm -v "${PWD}:/workspace" -w /workspace amazonlinux:2 bash -c "
    yum install -y zip > /dev/null 2>&1
    zip -r image-converter-lambda.zip index.js package.json node_modules -x '*.git*' '*.DS_Store*'
"

# Copy zip to infra directory for Terraform
Write-Host "Copying deployment package to infra directory..." -ForegroundColor Yellow
Copy-Item "image-converter-lambda.zip" "../infra/"

Write-Host "Build complete!" -ForegroundColor Green
Write-Host "Lambda package created: image-converter-lambda.zip" -ForegroundColor Green
Write-Host "Package copied to infra/ directory for Terraform deployment." -ForegroundColor Green
