#!/bin/bash

# ============================================
# 抖音直播监控系统 - Docker 一键部署脚本
# 适用于 Alibaba Cloud Linux 3 / CentOS / Ubuntu
# ============================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================="
echo "  抖音直播监控系统 - Docker 一键部署"
echo -e "==========================================${NC}"
echo ""

# 检查是否以 root 运行
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}请使用 sudo 运行此脚本${NC}"
    echo "示例: sudo bash $0"
    exit 1
fi

# 检测操作系统
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VERSION=$VERSION_ID
else
    echo -e "${RED}无法检测操作系统${NC}"
    exit 1
fi

echo -e "${YELLOW}检测到操作系统: $OS $VERSION${NC}"
echo ""

# 步骤 1: 安装 Docker
echo -e "${YELLOW}[1/6] 检查 Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker 未安装，正在安装...${NC}"
    
    if [ "$OS" == "alinux" ] || [ "$OS" == "centos" ]; then
        # Alibaba Cloud Linux / CentOS
        yum install -y yum-utils
        yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        yum install -y docker-ce docker-ce-cli containerd.io
        systemctl start docker
        systemctl enable docker
    elif [ "$OS" == "ubuntu" ] || [ "$OS" == "debian" ]; then
        # Ubuntu / Debian
        apt update
        apt install -y docker.io docker-compose
        systemctl start docker
        systemctl enable docker
    else
        echo -e "${RED}不支持的操作系统: $OS${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Docker 安装成功${NC}"
else
    echo -e "${GREEN}✓ Docker 已安装: $(docker --version)${NC}"
fi

# 步骤 2: 安装 Docker Compose
echo -e "\n${YELLOW}[2/6] 检查 Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}Docker Compose 未安装，正在安装...${NC}"
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✓ Docker Compose 安装成功${NC}"
else
    echo -e "${GREEN}✓ Docker Compose 已安装: $(docker-compose --version)${NC}"
fi

# 步骤 3: 配置用户组
echo -e "\n${YELLOW}[3/6] 配置 Docker 用户组...${NC}"
if ! getent group docker > /dev/null; then
    groupadd docker
fi

# 获取当前登录用户（非 root）
CURRENT_USER=$(logname 2>/dev/null || echo $SUDO_USER)
if [ -n "$CURRENT_USER" ] && [ "$CURRENT_USER" != "root" ]; then
    usermod -aG docker $CURRENT_USER
    echo -e "${GREEN}✓ 已将用户 $CURRENT_USER 添加到 docker 组${NC}"
    echo -e "${YELLOW}⚠️  请重新登录以使更改生效${NC}"
else
    echo -e "${YELLOW}⚠️  请以普通用户使用 sudo 运行此脚本${NC}"
fi

# 步骤 4: 检查项目文件
echo -e "\n${YELLOW}[4/6] 检查项目文件...${NC}"
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ 未找到 docker-compose.yml 文件${NC}"
    echo -e "${YELLOW}请确保在项目根目录运行此脚本${NC}"
    exit 1
fi

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env 文件不存在${NC}"
    if [ -f ".env.docker.example" ]; then
        cp .env.docker.example .env
        echo -e "${GREEN}✓ 已从模板创建 .env 文件${NC}"
        echo -e "${YELLOW}⚠️  请编辑 .env 文件配置必要参数后再继续${NC}"
        echo ""
        read -p "按回车键继续..." 
    else
        echo -e "${RED}❌ 未找到 .env.docker.example 模板文件${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ .env 文件存在${NC}"
fi

# 步骤 5: 检查必要配置
echo -e "\n${YELLOW}[5/6] 检查必要配置...${NC}"

# 检查 DOUYIN_COOKIE
COOKIE=$(grep "^DOUYIN_COOKIE=" .env | cut -d'=' -f2-)
if [ -z "$COOKIE" ]; then
    echo -e "${RED}❌ DOUYIN_COOKIE 未配置${NC}"
    echo -e "${YELLOW}请编辑 .env 文件，填入抖音 Cookie${NC}"
    echo ""
    echo "如何获取 Cookie："
    echo "1. 打开 Chrome 浏览器，访问 https://live.douyin.com"
    echo "2. 按 F12 打开开发者工具"
    echo "3. 切换到 Network 标签，刷新页面"
    echo "4. 复制任意请求的 cookie 字段"
    echo "5. 粘贴到 .env 文件的 DOUYIN_COOKIE= 后面"
    echo ""
    read -p "配置完成后按回车键继续..."
else
    echo -e "${GREEN}✓ DOUYIN_COOKIE 已配置${NC}"
fi

# 步骤 6: 启动服务
echo -e "\n${YELLOW}[6/6] 启动服务...${NC}"
echo -e "${BLUE}正在构建并启动 Docker 容器...${NC}"

# 停止旧容器（如果存在）
docker-compose down 2>/dev/null || true

# 构建并启动
docker-compose up -d --build

# 等待服务启动
echo -e "\n${YELLOW}等待服务启动...${NC}"
sleep 15

# 检查服务状态
echo -e "\n${BLUE}=========================================="
echo "  服务状态"
echo -e "==========================================${NC}"
docker-compose ps

echo ""
echo -e "${BLUE}=========================================="
echo "  日志输出"
echo -e "==========================================${NC}"
echo -e "${YELLOW}后端日志（最近 20 行）:${NC}"
docker-compose logs --tail=20 backend

echo ""
echo -e "${GREEN}=========================================="
echo "  🎉 部署完成！"
echo -e "==========================================${NC}"
echo ""

# 获取服务器 IP
SERVER_IP=$(hostname -I | awk '{print $1}')
if [ -z "$SERVER_IP" ]; then
    SERVER_IP="你的服务器IP"
fi

echo -e "${GREEN}访问地址:${NC}"
echo -e "  前端页面: ${BLUE}http://$SERVER_IP${NC}"
echo -e "  后端 API: ${BLUE}http://$SERVER_IP:5678${NC}"
echo ""
echo -e "${YELLOW}常用命令:${NC}"
echo -e "  查看状态:   ${BLUE}docker-compose ps${NC}"
echo -e "  查看日志:   ${BLUE}docker-compose logs -f${NC}"
echo -e "  重启服务:   ${BLUE}docker-compose restart${NC}"
echo -e "  停止服务:   ${BLUE}docker-compose down${NC}"
echo ""
echo -e "${YELLOW}下一步:${NC}"
echo -e "  1. 访问前端页面添加直播间"
echo -e "  2. 配置 QQ 机器人（可选）"
echo -e "  3. 配置域名和 SSL 证书（推荐）"
echo ""
echo -e "${GREEN}详细文档: DOCKER_DEPLOY.md${NC}"
echo ""
