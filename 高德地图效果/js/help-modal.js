// 帮助文档悬浮窗口功能模块
const HelpModal = {
    modal: null,
    modalContent: null,
    iframe: null,
    isDragging: false,
    dragOffset: { x: 0, y: 0 },
    
    // 初始化帮助文档功能
    init() {
        this.modal = document.getElementById('help-modal');
        this.modalContent = this.modal.querySelector('.help-modal-content');
        this.iframe = document.getElementById('help-iframe');
        
        this.bindEvents();
        console.log('帮助文档模块初始化完成');
    },
    
    // 绑定事件
    bindEvents() {
        const helpBtn = document.getElementById('help-btn');
        const closeBtn = document.getElementById('close-help-modal');
        const modalHeader = this.modal.querySelector('.help-modal-header');
        
        // 打开帮助文档
        helpBtn.addEventListener('click', () => {
            this.openModal();
        });
        
        // 关闭帮助文档
        closeBtn.addEventListener('click', () => {
            this.closeModal();
        });
        
        // 点击背景关闭
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });
        
        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('show')) {
                this.closeModal();
            }
        });
        
        // 拖拽功能
        this.initDragFunctionality(modalHeader);
    },
    
    // 打开模态窗口
    openModal() {
        try {
            // 设置iframe源地址
            this.iframe.src = 'docs/功能说明文档.html';
            
            // 显示模态窗口
            this.modal.classList.add('show');
            
            // 禁用页面滚动
            document.body.style.overflow = 'hidden';
            
            // 重置位置到中心
            this.resetPosition();
            
            console.log('帮助文档已打开');
        } catch (error) {
            console.error('打开帮助文档失败：', error);
            MessageUtils.show('打开帮助文档失败', 'error');
        }
    },
    
    // 关闭模态窗口
    closeModal() {
        this.modal.classList.remove('show');
        
        // 恢复页面滚动
        document.body.style.overflow = '';
        
        // 延迟清空iframe以避免闪烁
        setTimeout(() => {
            if (!this.modal.classList.contains('show')) {
                this.iframe.src = '';
            }
        }, 300);
        
        console.log('帮助文档已关闭');
    },
    
    // 初始化拖拽功能
    initDragFunctionality(dragHandle) {
        let startX, startY, initialX, initialY;
        
        dragHandle.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            
            // 记录初始位置
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = this.modalContent.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
            
            // 添加拖拽样式
            this.modalContent.style.transition = 'none';
            dragHandle.style.cursor = 'grabbing';
            
            // 防止文本选择
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            
            // 计算新位置
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const newX = initialX + deltaX;
            const newY = initialY + deltaY;
            
            // 限制在视窗内
            const maxX = window.innerWidth - this.modalContent.offsetWidth;
            const maxY = window.innerHeight - this.modalContent.offsetHeight;
            
            const constrainedX = Math.max(0, Math.min(newX, maxX));
            const constrainedY = Math.max(0, Math.min(newY, maxY));
            
            // 应用新位置
            this.modalContent.style.position = 'fixed';
            this.modalContent.style.left = constrainedX + 'px';
            this.modalContent.style.top = constrainedY + 'px';
            this.modalContent.style.transform = 'none';
        });
        
        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                
                // 恢复样式
                this.modalContent.style.transition = '';
                dragHandle.style.cursor = 'move';
            }
        });
        
        // 触摸设备支持
        dragHandle.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            this.isDragging = true;
            
            startX = touch.clientX;
            startY = touch.clientY;
            
            const rect = this.modalContent.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
            
            this.modalContent.style.transition = 'none';
            e.preventDefault();
        });
        
        document.addEventListener('touchmove', (e) => {
            if (!this.isDragging) return;
            
            const touch = e.touches[0];
            const deltaX = touch.clientX - startX;
            const deltaY = touch.clientY - startY;
            
            const newX = initialX + deltaX;
            const newY = initialY + deltaY;
            
            const maxX = window.innerWidth - this.modalContent.offsetWidth;
            const maxY = window.innerHeight - this.modalContent.offsetHeight;
            
            const constrainedX = Math.max(0, Math.min(newX, maxX));
            const constrainedY = Math.max(0, Math.min(newY, maxY));
            
            this.modalContent.style.position = 'fixed';
            this.modalContent.style.left = constrainedX + 'px';
            this.modalContent.style.top = constrainedY + 'px';
            this.modalContent.style.transform = 'none';
            
            e.preventDefault();
        });
        
        document.addEventListener('touchend', () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.modalContent.style.transition = '';
            }
        });
    },
    
    // 重置位置到中心
    resetPosition() {
        this.modalContent.style.position = '';
        this.modalContent.style.left = '';
        this.modalContent.style.top = '';
        this.modalContent.style.transform = '';
    },
    
    // 检查是否已打开
    isOpen() {
        return this.modal.classList.contains('show');
    },
    
    // 切换显示状态
    toggle() {
        if (this.isOpen()) {
            this.closeModal();
        } else {
            this.openModal();
        }
    }
};

// 在页面加载完成后初始化
if (typeof window !== 'undefined') {
    // 如果MessageUtils还未定义，创建一个简单的版本
    if (typeof MessageUtils === 'undefined') {
        window.MessageUtils = {
            show: function(message, type) {
                console.log(`[${type.toUpperCase()}] ${message}`);
            }
        };
    }
}