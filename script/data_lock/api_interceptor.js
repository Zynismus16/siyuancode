// 全局设置笔记本ID - 需要根据实际情况修改
const targetBoxID = ""; // 这里设置需要特殊处理的笔记本ID

// 保存原始的fetch方法
const originalFetch = window.fetch;

// 重写fetch方法进行API拦截
window.fetch = async function(input, init) {
    // 只拦截setBlockAttrs请求
    if (typeof input === 'string' && input.includes('/api/attr/setBlockAttrs')) {
        // 克隆请求参数，避免修改原始请求
        const clonedInit = { ...init };
        
        if (init && init.body) {
            // 解析请求体
            const requestBody = JSON.parse(init.body);
            const blockID = requestBody.id;
            
            // 检查此文档所属的笔记本是否为目标笔记本
            const boxInfo = await checkDocumentBox(blockID);
            
            if (boxInfo && boxInfo.box === targetBoxID) {
                // 提取文档ID中的日期部分 (前8位)
                const docDate = blockID.substring(0, 8);
                const today = getTodayDateString();
                
                // 如果不是当天的文档且正在尝试修改锁定状态
                if (docDate !== today && 
                    requestBody.attrs && 
                    "custom-sy-readonly" in requestBody.attrs) {
                    
                    // 创建新的请求体，强制设置锁定状态为true
                    const newBody = { ...requestBody };
                    newBody.attrs["custom-sy-readonly"] = "true";
                    
                    // 更新请求
                    clonedInit.body = JSON.stringify(newBody);
                    console.log("已锁定非当天文档:", blockID);
                    
                    // 显示弹窗提示
                    showLockNotification(docDate);
                }
            }
        }
        
        // 使用可能修改过的参数继续请求
        return originalFetch(input, clonedInit);
    }
    
    // 非目标API，正常请求
    return originalFetch(input, init);
};

// 获取文档所属的笔记本ID
async function checkDocumentBox(blockID) {
    try {
        const response = await originalFetch("/api/block/getBlockInfo", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ id: blockID })
        });
        
        const result = await response.json();
        
        if (result.code === 0 && result.data) {
            return result.data;
        }
        return null;
    } catch (error) {
        console.error("获取文档信息失败:", error);
        return null;
    }
}

// 获取当前日期字符串，格式为YYYYMMDD
function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    return `${year}${month}${day}`;
}

// 显示锁定通知弹窗
function showLockNotification(docDate) {
    // 格式化日期显示
    const year = docDate.substring(0, 4);
    const month = docDate.substring(4, 6);
    const day = docDate.substring(6, 8);
    const formattedDate = `${year}-${month}-${day}`;
    
    // 创建弹窗元素
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.backgroundColor = '#ff4d4f';
    notification.style.color = 'white';
    notification.style.padding = '12px 24px';
    notification.style.borderRadius = '4px';
    notification.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    notification.style.zIndex = '9999';
    notification.style.fontWeight = 'bold';
    notification.style.fontSize = '14px';
    notification.style.display = 'flex';
    notification.style.alignItems = 'center';
    notification.style.gap = '8px';
    
    // 添加图标
    const icon = document.createElement('span');
    icon.innerHTML = '🔒';
    icon.style.fontSize = '16px';
    notification.appendChild(icon);
    
    // 添加文本
    const text = document.createElement('span');
    text.textContent = `该日记（${formattedDate}）非当前时间，已永久锁定`;
    notification.appendChild(text);
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 3秒后自动移除
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s ease';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

console.log("思源笔记API拦截器已加载，目标笔记本ID:", targetBoxID); 
