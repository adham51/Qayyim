# Use a slim Python 3.10 image to keep the size down
FROM python:3.10-slim

# Install system dependencies required for ML libraries and standard building
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy the requirements file first to leverage Docker's cache
COPY requirements.txt .

# Install dependencies using the PyTorch CPU-specific index
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose the port (using the variable from your config or 5000)
EXPOSE 5000

# Run the server
CMD ["python", "server_kaggle.py"]