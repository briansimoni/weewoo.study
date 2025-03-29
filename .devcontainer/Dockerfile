FROM mcr.microsoft.com/devcontainers/base:ubuntu

# Install necessary packages
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    git \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user with sudo access
ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Install Deno for the non-root user
USER $USERNAME
RUN curl -fsSL https://deno.land/x/install/install.sh | sh
ENV DENO_INSTALL="/home/$USERNAME/.deno"
ENV PATH="$DENO_INSTALL/bin:$PATH"

# Switch back to root for any additional setup
USER root

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs
