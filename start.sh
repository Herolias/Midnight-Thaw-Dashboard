#!/bin/bash
echo "========================================"
echo "  Midnight Thaw Tracker - Starting..."
echo "========================================"
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[INFO] Node.js is not installed. Attempting to install..."
    echo
    
    # Detect OS and install accordingly
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            echo "Installing Node.js via Homebrew..."
            brew install node
        else
            echo "Installing Homebrew first..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            brew install node
        fi
    elif [[ -f /etc/debian_version ]]; then
        # Debian/Ubuntu
        echo "Installing Node.js via apt..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [[ -f /etc/redhat-release ]]; then
        # RHEL/CentOS/Fedora
        echo "Installing Node.js via dnf/yum..."
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        sudo yum install -y nodejs || sudo dnf install -y nodejs
    elif [[ -f /etc/arch-release ]]; then
        # Arch Linux
        echo "Installing Node.js via pacman..."
        sudo pacman -S --noconfirm nodejs npm
    else
        # Fallback: use nvm
        echo "Installing Node.js via nvm..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        nvm install 20
        nvm use 20
    fi
    
    # Verify installation
    if ! command -v node &> /dev/null; then
        echo "[ERROR] Node.js installation failed."
        echo "Please install Node.js 18+ manually from https://nodejs.org/"
        exit 1
    fi
    echo "[SUCCESS] Node.js installed!"
    echo
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo
fi

# Start the server
echo "Starting server..."
echo "Open http://localhost:3000 in your browser"
echo
npm start
