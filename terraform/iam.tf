# SAMS IAM Roles and Policies
# Comprehensive IAM configuration for all services

# KMS Keys
resource "aws_kms_key" "eks_key" {
  description             = "KMS key for EKS cluster encryption"
  deletion_window_in_days = 7
  
  tags = {
    Name = "sams-eks-key-${var.environment}"
  }
}

resource "aws_kms_alias" "eks_key_alias" {
  name          = "alias/sams-eks-${var.environment}"
  target_key_id = aws_kms_key.eks_key.key_id
}

resource "aws_kms_key" "rds_key" {
  description             = "KMS key for RDS encryption"
  deletion_window_in_days = 7
  
  tags = {
    Name = "sams-rds-key-${var.environment}"
  }
}

resource "aws_kms_alias" "rds_key_alias" {
  name          = "alias/sams-rds-${var.environment}"
  target_key_id = aws_kms_key.rds_key.key_id
}

# EKS Cluster IAM Role
resource "aws_iam_role" "eks_cluster_role" {
  name = "sams-eks-cluster-role-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
      }
    ]
  })
  
  tags = {
    Name = "sams-eks-cluster-role-${var.environment}"
  }
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster_role.name
}

resource "aws_iam_role_policy_attachment" "eks_vpc_resource_controller" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController"
  role       = aws_iam_role.eks_cluster_role.name
}

# EKS Node Group IAM Role
resource "aws_iam_role" "eks_node_role" {
  name = "sams-eks-node-role-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
  
  tags = {
    Name = "sams-eks-node-role-${var.environment}"
  }
}

resource "aws_iam_role_policy_attachment" "eks_worker_node_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_node_role.name
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_node_role.name
}

resource "aws_iam_role_policy_attachment" "eks_container_registry_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_node_role.name
}

# RDS Monitoring Role
resource "aws_iam_role" "rds_monitoring_role" {
  name = "sams-rds-monitoring-role-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
  
  tags = {
    Name = "sams-rds-monitoring-role-${var.environment}"
  }
}

resource "aws_iam_role_policy_attachment" "rds_monitoring_policy" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
  role       = aws_iam_role.rds_monitoring_role.name
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "eks_cluster_logs" {
  name              = "/aws/eks/sams-cluster-${var.environment}/cluster"
  retention_in_days = var.log_retention_days
  
  tags = {
    Name = "sams-eks-logs-${var.environment}"
  }
}

resource "aws_cloudwatch_log_group" "redis_slow_logs" {
  name              = "/aws/elasticache/sams-redis-${var.environment}/slow-log"
  retention_in_days = var.log_retention_days
  
  tags = {
    Name = "sams-redis-logs-${var.environment}"
  }
}

# Application Load Balancer Policy
resource "aws_s3_bucket_policy" "alb_logs_policy" {
  bucket = aws_s3_bucket.alb_logs.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_elb_service_account.main.id}:root"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.alb_logs.arn}/*"
      },
      {
        Effect = "Allow"
        Principal = {
          Service = "delivery.logs.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.alb_logs.arn}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      }
    ]
  })
}

# ELB Service Account
data "aws_elb_service_account" "main" {}

# Cluster Autoscaler IAM Role
resource "aws_iam_role" "cluster_autoscaler_role" {
  name = "sams-cluster-autoscaler-role-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
  
  tags = {
    Name = "sams-cluster-autoscaler-role-${var.environment}"
  }
}

resource "aws_iam_policy" "cluster_autoscaler_policy" {
  name        = "sams-cluster-autoscaler-policy-${var.environment}"
  description = "Policy for cluster autoscaler"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "autoscaling:DescribeAutoScalingGroups",
          "autoscaling:DescribeAutoScalingInstances",
          "autoscaling:DescribeLaunchConfigurations",
          "autoscaling:DescribeTags",
          "autoscaling:SetDesiredCapacity",
          "autoscaling:TerminateInstanceInAutoScalingGroup",
          "ec2:DescribeLaunchTemplateVersions"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "cluster_autoscaler_policy_attachment" {
  policy_arn = aws_iam_policy.cluster_autoscaler_policy.arn
  role       = aws_iam_role.cluster_autoscaler_role.name
}

# AWS Load Balancer Controller IAM Role
resource "aws_iam_role" "aws_load_balancer_controller_role" {
  name = "sams-aws-load-balancer-controller-role-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Federated = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/${replace(aws_eks_cluster.sams_cluster.identity[0].oidc[0].issuer, "https://", "")}"
        }
        Condition = {
          StringEquals = {
            "${replace(aws_eks_cluster.sams_cluster.identity[0].oidc[0].issuer, "https://", "")}:sub" = "system:serviceaccount:kube-system:aws-load-balancer-controller"
            "${replace(aws_eks_cluster.sams_cluster.identity[0].oidc[0].issuer, "https://", "")}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })
  
  tags = {
    Name = "sams-aws-load-balancer-controller-role-${var.environment}"
  }
}

resource "aws_iam_policy" "aws_load_balancer_controller_policy" {
  name        = "sams-aws-load-balancer-controller-policy-${var.environment}"
  description = "Policy for AWS Load Balancer Controller"
  
  policy = file("${path.module}/policies/aws-load-balancer-controller-policy.json")
}

resource "aws_iam_role_policy_attachment" "aws_load_balancer_controller_policy_attachment" {
  policy_arn = aws_iam_policy.aws_load_balancer_controller_policy.arn
  role       = aws_iam_role.aws_load_balancer_controller_role.name
}
