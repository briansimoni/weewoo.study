FROM mcr.microsoft.com/devcontainers/base:ubuntu

# Install Deno
RUN curl -fsSL https://deno.land/x/install/install.sh | sh && \
    echo 'export DENO_INSTALL="/root/.deno"' >> /etc/bash.bashrc && \
    echo 'export PATH="$DENO_INSTALL/bin:$PATH"' >> /etc/bash.bashrc

# Set up environment variables
ENV DENO_INSTALL="/root/.deno"
ENV PATH="$DENO_INSTALL/bin:$PATH"

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs
