# SAMS Terraform Outputs
# Output values for infrastructure components

# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.sams_vpc.id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.sams_vpc.cidr_block
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public_subnets[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private_subnets[*].id
}

# EKS Cluster Outputs
output "cluster_id" {
  description = "EKS cluster ID"
  value       = aws_eks_cluster.sams_cluster.id
}

output "cluster_name" {
  description = "EKS cluster name"
  value       = aws_eks_cluster.sams_cluster.name
}

output "cluster_arn" {
  description = "EKS cluster ARN"
  value       = aws_eks_cluster.sams_cluster.arn
}

output "cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = aws_eks_cluster.sams_cluster.endpoint
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = aws_eks_cluster.sams_cluster.vpc_config[0].cluster_security_group_id
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = aws_eks_cluster.sams_cluster.certificate_authority[0].data
}

output "cluster_version" {
  description = "The Kubernetes version for the EKS cluster"
  value       = aws_eks_cluster.sams_cluster.version
}

output "cluster_oidc_issuer_url" {
  description = "The URL on the EKS cluster OIDC Issuer"
  value       = aws_eks_cluster.sams_cluster.identity[0].oidc[0].issuer
}

# EKS Node Group Outputs
output "node_group_arn" {
  description = "Amazon Resource Name (ARN) of the EKS Node Group"
  value       = aws_eks_node_group.sams_nodes.arn
}

output "node_group_status" {
  description = "Status of the EKS Node Group"
  value       = aws_eks_node_group.sams_nodes.status
}

# RDS Outputs
output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.sams_db.endpoint
  sensitive   = true
}

output "rds_port" {
  description = "RDS instance port"
  value       = aws_db_instance.sams_db.port
}

output "rds_database_name" {
  description = "RDS database name"
  value       = aws_db_instance.sams_db.db_name
}

output "rds_username" {
  description = "RDS database username"
  value       = aws_db_instance.sams_db.username
  sensitive   = true
}

# Redis Outputs
output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = aws_elasticache_replication_group.sams_redis.primary_endpoint_address
  sensitive   = true
}

output "redis_port" {
  description = "Redis cluster port"
  value       = aws_elasticache_replication_group.sams_redis.port
}

output "redis_auth_token" {
  description = "Redis auth token"
  value       = aws_elasticache_replication_group.sams_redis.auth_token
  sensitive   = true
}

# Load Balancer Outputs
output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = aws_lb.sams_alb.arn
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.sams_alb.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = aws_lb.sams_alb.zone_id
}

# S3 Outputs
output "alb_logs_bucket" {
  description = "S3 bucket for ALB logs"
  value       = aws_s3_bucket.alb_logs.bucket
}

output "alb_logs_bucket_arn" {
  description = "ARN of S3 bucket for ALB logs"
  value       = aws_s3_bucket.alb_logs.arn
}

# Security Group Outputs
output "eks_cluster_security_group_id" {
  description = "Security group ID for EKS cluster"
  value       = aws_security_group.eks_cluster_sg.id
}

output "eks_node_security_group_id" {
  description = "Security group ID for EKS nodes"
  value       = aws_security_group.eks_node_sg.id
}

output "rds_security_group_id" {
  description = "Security group ID for RDS"
  value       = aws_security_group.rds_sg.id
}

output "redis_security_group_id" {
  description = "Security group ID for Redis"
  value       = aws_security_group.redis_sg.id
}

output "alb_security_group_id" {
  description = "Security group ID for ALB"
  value       = aws_security_group.alb_sg.id
}

# IAM Role Outputs
output "eks_cluster_role_arn" {
  description = "ARN of the EKS cluster IAM role"
  value       = aws_iam_role.eks_cluster_role.arn
}

output "eks_node_role_arn" {
  description = "ARN of the EKS node group IAM role"
  value       = aws_iam_role.eks_node_role.arn
}

output "rds_monitoring_role_arn" {
  description = "ARN of the RDS monitoring IAM role"
  value       = aws_iam_role.rds_monitoring_role.arn
}

# KMS Key Outputs
output "eks_kms_key_id" {
  description = "KMS key ID for EKS encryption"
  value       = aws_kms_key.eks_key.key_id
}

output "eks_kms_key_arn" {
  description = "KMS key ARN for EKS encryption"
  value       = aws_kms_key.eks_key.arn
}

output "rds_kms_key_id" {
  description = "KMS key ID for RDS encryption"
  value       = aws_kms_key.rds_key.key_id
}

output "rds_kms_key_arn" {
  description = "KMS key ARN for RDS encryption"
  value       = aws_kms_key.rds_key.arn
}

# Environment Information
output "environment" {
  description = "Environment name"
  value       = var.environment
}

output "aws_region" {
  description = "AWS region"
  value       = var.aws_region
}

output "availability_zones" {
  description = "List of availability zones"
  value       = data.aws_availability_zones.available.names
}

# Monitoring Outputs
output "cloudwatch_log_group_eks" {
  description = "CloudWatch log group for EKS"
  value       = aws_cloudwatch_log_group.eks_cluster_logs.name
}

output "cloudwatch_log_group_redis" {
  description = "CloudWatch log group for Redis"
  value       = aws_cloudwatch_log_group.redis_slow_logs.name
}

# Network Configuration
output "nat_gateway_ids" {
  description = "List of NAT Gateway IDs"
  value       = aws_nat_gateway.nat_gateways[*].id
}

output "internet_gateway_id" {
  description = "Internet Gateway ID"
  value       = aws_internet_gateway.sams_igw.id
}

# Deployment Information
output "deployment_timestamp" {
  description = "Timestamp of deployment"
  value       = timestamp()
}

output "terraform_workspace" {
  description = "Terraform workspace"
  value       = terraform.workspace
}

# Connection Strings (for application configuration)
output "database_connection_string" {
  description = "Database connection string template"
  value       = "postgresql://${aws_db_instance.sams_db.username}:PASSWORD@${aws_db_instance.sams_db.endpoint}:${aws_db_instance.sams_db.port}/${aws_db_instance.sams_db.db_name}"
  sensitive   = true
}

output "redis_connection_string" {
  description = "Redis connection string template"
  value       = "redis://:AUTH_TOKEN@${aws_elasticache_replication_group.sams_redis.primary_endpoint_address}:${aws_elasticache_replication_group.sams_redis.port}"
  sensitive   = true
}

# Kubernetes Configuration
output "kubeconfig_command" {
  description = "Command to update kubeconfig"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${aws_eks_cluster.sams_cluster.name}"
}

# Application URLs (to be configured after deployment)
output "application_urls" {
  description = "Application URLs (configure DNS after deployment)"
  value = {
    frontend = "https://${var.domain_name}"
    api      = "https://${var.api_domain_name}"
    grafana  = "https://grafana.${var.domain_name}"
    prometheus = "https://prometheus.${var.domain_name}"
  }
}
