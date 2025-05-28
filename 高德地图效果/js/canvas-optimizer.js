/**
 * Canvas性能优化模块
 * 解决高德地图API中Canvas2D的willReadFrequently性能警告
 */
const CanvasOptimizer = {
    // 是否已经初始化
    initialized: false,
    
    // 初始化Canvas优化
    init() {
        if (this.initialized) return;
        
        console.log('Canvas性能优化模块初始化...');
        
        // 重写Canvas的getContext方法
        this.overrideCanvasContext();
        
        // 监听DOM变化，优化动态创建的Canvas
        this.observeCanvasCreation();
        
        this.initialized = true;
        console.log('Canvas性能优化模块初始化完成');
    },
    
    // 重写Canvas的getContext方法
    overrideCanvasContext() {
        const originalGetContext = HTMLCanvasElement.prototype.getContext;
        
        HTMLCanvasElement.prototype.getContext = function(contextType, contextAttributes = {}) {
            // 如果是2D上下文且没有设置willReadFrequently，则自动设置为true
            if (contextType === '2d' || contextType === '2D') {
                if (!contextAttributes.hasOwnProperty('willReadFrequently')) {
                    contextAttributes.willReadFrequently = true;
                    console.log('自动为Canvas 2D上下文设置willReadFrequently: true');
                }
            }
            
            return originalGetContext.call(this, contextType, contextAttributes);
        };
    },
    
    // 监听Canvas元素的创建
    observeCanvasCreation() {
        // 使用MutationObserver监听DOM变化
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // 检查新添加的节点是否为Canvas或包含Canvas
                        this.optimizeCanvasElements(node);
                    }
                });
            });
        });
        
        // 开始观察整个文档的变化
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        console.log('Canvas创建监听器已启动');
    },
    
    // 优化Canvas元素
    optimizeCanvasElements(element) {
        const canvases = element.tagName === 'CANVAS' ? [element] : element.querySelectorAll('canvas');
        
        canvases.forEach((canvas, index) => {
            try {
                // 如果Canvas还没有获取过上下文，则在获取时会自动优化
                // 如果已经获取过上下文，则尝试其他优化方法
                this.optimizeExistingCanvas(canvas);
            } catch (error) {
                console.log(`Canvas优化失败 (${index}):`, error.message);
            }
        });
    },
    
    // 优化已存在的Canvas
    optimizeExistingCanvas(canvas) {
        // 检查Canvas是否已经有上下文
        try {
            const ctx = canvas.getContext('2d');
            if (ctx && !ctx.willReadFrequently) {
                // 如果上下文已存在但没有优化，记录信息
                console.log('发现未优化的Canvas 2D上下文，建议刷新页面以应用优化');
            }
        } catch (error) {
            // 忽略错误，可能是WebGL上下文或其他类型
        }
    },
    
    // 手动优化指定容器内的所有Canvas
    optimizeContainer(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`容器 ${containerId} 不存在`);
            return;
        }
        
        const canvases = container.querySelectorAll('canvas');
        console.log(`在容器 ${containerId} 中发现 ${canvases.length} 个Canvas元素`);
        
        canvases.forEach((canvas, index) => {
            this.optimizeExistingCanvas(canvas);
        });
    },
    
    // 获取Canvas性能统计信息
    getPerformanceStats() {
        const canvases = document.querySelectorAll('canvas');
        let optimizedCount = 0;
        let totalCount = canvases.length;
        
        canvases.forEach((canvas) => {
            try {
                const ctx = canvas.getContext('2d');
                if (ctx && ctx.willReadFrequently) {
                    optimizedCount++;
                }
            } catch (error) {
                // 忽略非2D上下文
            }
        });
        
        return {
            total: totalCount,
            optimized: optimizedCount,
            percentage: totalCount > 0 ? (optimizedCount / totalCount * 100).toFixed(1) : 0
        };
    }
};

// 页面加载时自动初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        CanvasOptimizer.init();
    });
} else {
    CanvasOptimizer.init();
}

// 导出模块
window.CanvasOptimizer = CanvasOptimizer;