# SAMS Production Infrastructure
# Terraform configuration for AWS deployment

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.10"
    }
  }
  
  backend "s3" {
    bucket         = "sams-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "sams-terraform-locks"
  }
}

# Provider configurations
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "SAMS"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = "SAMS-Team"
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# VPC Configuration
resource "aws_vpc" "sams_vpc" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = {
    Name = "sams-vpc-${var.environment}"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "sams_igw" {
  vpc_id = aws_vpc.sams_vpc.id
  
  tags = {
    Name = "sams-igw-${var.environment}"
  }
}

# Public Subnets
resource "aws_subnet" "public_subnets" {
  count = length(var.public_subnet_cidrs)
  
  vpc_id                  = aws_vpc.sams_vpc.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  
  tags = {
    Name = "sams-public-subnet-${count.index + 1}-${var.environment}"
    Type = "Public"
  }
}

# Private Subnets
resource "aws_subnet" "private_subnets" {
  count = length(var.private_subnet_cidrs)
  
  vpc_id            = aws_vpc.sams_vpc.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = data.aws_availability_zones.available.names[count.index]
  
  tags = {
    Name = "sams-private-subnet-${count.index + 1}-${var.environment}"
    Type = "Private"
  }
}

# NAT Gateways
resource "aws_eip" "nat_eips" {
  count = length(aws_subnet.public_subnets)
  
  domain = "vpc"
  
  tags = {
    Name = "sams-nat-eip-${count.index + 1}-${var.environment}"
  }
  
  depends_on = [aws_internet_gateway.sams_igw]
}

resource "aws_nat_gateway" "nat_gateways" {
  count = length(aws_subnet.public_subnets)
  
  allocation_id = aws_eip.nat_eips[count.index].id
  subnet_id     = aws_subnet.public_subnets[count.index].id
  
  tags = {
    Name = "sams-nat-gateway-${count.index + 1}-${var.environment}"
  }
  
  depends_on = [aws_internet_gateway.sams_igw]
}

# Route Tables
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.sams_vpc.id
  
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.sams_igw.id
  }
  
  tags = {
    Name = "sams-public-rt-${var.environment}"
  }
}

resource "aws_route_table" "private_rts" {
  count = length(aws_nat_gateway.nat_gateways)
  
  vpc_id = aws_vpc.sams_vpc.id
  
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat_gateways[count.index].id
  }
  
  tags = {
    Name = "sams-private-rt-${count.index + 1}-${var.environment}"
  }
}

# Route Table Associations
resource "aws_route_table_association" "public_rta" {
  count = length(aws_subnet.public_subnets)
  
  subnet_id      = aws_subnet.public_subnets[count.index].id
  route_table_id = aws_route_table.public_rt.id
}

resource "aws_route_table_association" "private_rta" {
  count = length(aws_subnet.private_subnets)
  
  subnet_id      = aws_subnet.private_subnets[count.index].id
  route_table_id = aws_route_table.private_rts[count.index].id
}

# Security Groups
resource "aws_security_group" "eks_cluster_sg" {
  name_prefix = "sams-eks-cluster-sg-"
  vpc_id      = aws_vpc.sams_vpc.id
  
  ingress {
    from_port = 443
    to_port   = 443
    protocol  = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "sams-eks-cluster-sg-${var.environment}"
  }
}

resource "aws_security_group" "eks_node_sg" {
  name_prefix = "sams-eks-node-sg-"
  vpc_id      = aws_vpc.sams_vpc.id
  
  ingress {
    from_port = 0
    to_port   = 65535
    protocol  = "tcp"
    self      = true
  }
  
  ingress {
    from_port       = 1025
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_cluster_sg.id]
  }
  
  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_cluster_sg.id]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "sams-eks-node-sg-${var.environment}"
  }
}

resource "aws_security_group" "rds_sg" {
  name_prefix = "sams-rds-sg-"
  vpc_id      = aws_vpc.sams_vpc.id
  
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_node_sg.id]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "sams-rds-sg-${var.environment}"
  }
}

# EKS Cluster
resource "aws_eks_cluster" "sams_cluster" {
  name     = "sams-cluster-${var.environment}"
  role_arn = aws_iam_role.eks_cluster_role.arn
  version  = var.kubernetes_version
  
  vpc_config {
    subnet_ids              = concat(aws_subnet.public_subnets[*].id, aws_subnet.private_subnets[*].id)
    security_group_ids      = [aws_security_group.eks_cluster_sg.id]
    endpoint_private_access = true
    endpoint_public_access  = true
    public_access_cidrs     = var.cluster_endpoint_public_access_cidrs
  }
  
  encryption_config {
    provider {
      key_arn = aws_kms_key.eks_key.arn
    }
    resources = ["secrets"]
  }
  
  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
  
  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy,
    aws_iam_role_policy_attachment.eks_vpc_resource_controller,
    aws_cloudwatch_log_group.eks_cluster_logs,
  ]
  
  tags = {
    Name = "sams-cluster-${var.environment}"
  }
}

# EKS Node Group
resource "aws_eks_node_group" "sams_nodes" {
  cluster_name    = aws_eks_cluster.sams_cluster.name
  node_group_name = "sams-nodes-${var.environment}"
  node_role_arn   = aws_iam_role.eks_node_role.arn
  subnet_ids      = aws_subnet.private_subnets[*].id
  
  capacity_type  = "ON_DEMAND"
  instance_types = var.node_instance_types
  ami_type       = "AL2_x86_64"
  disk_size      = var.node_disk_size
  
  scaling_config {
    desired_size = var.node_desired_size
    max_size     = var.node_max_size
    min_size     = var.node_min_size
  }
  
  update_config {
    max_unavailable = 1
  }
  
  remote_access {
    ec2_ssh_key               = var.node_ssh_key
    source_security_group_ids = [aws_security_group.eks_node_sg.id]
  }
  
  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_container_registry_policy,
  ]
  
  tags = {
    Name = "sams-nodes-${var.environment}"
  }
}

# RDS Subnet Group
resource "aws_db_subnet_group" "sams_db_subnet_group" {
  name       = "sams-db-subnet-group-${var.environment}"
  subnet_ids = aws_subnet.private_subnets[*].id
  
  tags = {
    Name = "sams-db-subnet-group-${var.environment}"
  }
}

# RDS Instance
resource "aws_db_instance" "sams_db" {
  identifier = "sams-db-${var.environment}"
  
  engine         = "postgres"
  engine_version = var.postgres_version
  instance_class = var.db_instance_class
  
  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id           = aws_kms_key.rds_key.arn
  
  db_name  = var.db_name
  username = var.db_username
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.sams_db_subnet_group.name
  
  backup_retention_period = var.db_backup_retention_period
  backup_window          = var.db_backup_window
  maintenance_window     = var.db_maintenance_window
  
  multi_az               = var.db_multi_az
  publicly_accessible    = false
  deletion_protection    = var.db_deletion_protection
  
  performance_insights_enabled = true
  monitoring_interval         = 60
  monitoring_role_arn         = aws_iam_role.rds_monitoring_role.arn
  
  enabled_cloudwatch_logs_exports = ["postgresql"]
  
  tags = {
    Name = "sams-db-${var.environment}"
  }
}

# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "sams_cache_subnet_group" {
  name       = "sams-cache-subnet-group-${var.environment}"
  subnet_ids = aws_subnet.private_subnets[*].id
  
  tags = {
    Name = "sams-cache-subnet-group-${var.environment}"
  }
}

# ElastiCache Redis Cluster
resource "aws_elasticache_replication_group" "sams_redis" {
  replication_group_id       = "sams-redis-${var.environment}"
  description                = "Redis cluster for SAMS ${var.environment}"
  
  node_type                  = var.redis_node_type
  port                       = 6379
  parameter_group_name       = "default.redis7"
  
  num_cache_clusters         = var.redis_num_cache_nodes
  automatic_failover_enabled = var.redis_automatic_failover_enabled
  multi_az_enabled          = var.redis_multi_az_enabled
  
  subnet_group_name = aws_elasticache_subnet_group.sams_cache_subnet_group.name
  security_group_ids = [aws_security_group.redis_sg.id]
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token
  
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow_logs.name
    destination_type = "cloudwatch-logs"
    log_format       = "text"
    log_type         = "slow-log"
  }
  
  tags = {
    Name = "sams-redis-${var.environment}"
  }
}

# Application Load Balancer
resource "aws_lb" "sams_alb" {
  name               = "sams-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets           = aws_subnet.public_subnets[*].id
  
  enable_deletion_protection = var.alb_deletion_protection
  
  access_logs {
    bucket  = aws_s3_bucket.alb_logs.bucket
    prefix  = "alb-logs"
    enabled = true
  }
  
  tags = {
    Name = "sams-alb-${var.environment}"
  }
}

# S3 Bucket for ALB Logs
resource "aws_s3_bucket" "alb_logs" {
  bucket = "sams-alb-logs-${var.environment}-${random_string.bucket_suffix.result}"
  
  tags = {
    Name = "sams-alb-logs-${var.environment}"
  }
}

resource "aws_s3_bucket_versioning" "alb_logs_versioning" {
  bucket = aws_s3_bucket.alb_logs.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "alb_logs_encryption" {
  bucket = aws_s3_bucket.alb_logs.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Random string for unique bucket naming
resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}

# Security Group for Redis
resource "aws_security_group" "redis_sg" {
  name_prefix = "sams-redis-sg-"
  vpc_id      = aws_vpc.sams_vpc.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_node_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "sams-redis-sg-${var.environment}"
  }
}

# Security Group for ALB
resource "aws_security_group" "alb_sg" {
  name_prefix = "sams-alb-sg-"
  vpc_id      = aws_vpc.sams_vpc.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "sams-alb-sg-${var.environment}"
  }
}
