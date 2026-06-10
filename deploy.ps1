aws ecr get-login-password --region eu-central-1 | docker login --username AWS --password-stdin 491991045754.dkr.ecr.eu-central-1.amazonaws.com
docker build -t 491991045754.dkr.ecr.eu-central-1.amazonaws.com/qayyim-app:latest .
docker build -t 491991045754.dkr.ecr.eu-central-1.amazonaws.com/qayyim-worker:latest -f Dockerfile.worker .
docker push 491991045754.dkr.ecr.eu-central-1.amazonaws.com/qayyim-app:latest
docker push 491991045754.dkr.ecr.eu-central-1.amazonaws.com/qayyim-worker:latest