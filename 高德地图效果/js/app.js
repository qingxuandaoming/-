// 主应用入口文件
const MapApp = {
    // 初始化应用
    init() {
        console.log('高德地图应用开始初始化...');
        
        try {
            // 初始化各个模块
            this.initModules();
            
            console.log('高德地图应用初始化完成');
            MessageUtils.show('应用初始化完成', 'success');
            
            // 显示Canvas性能优化统计 - 已禁用
            // this.showCanvasOptimizationStats();
        } catch (error) {
            console.error('应用初始化失败：', error);
            MessageUtils.show('应用初始化失败：' + error.message, 'error');
        }
    },
    
    // 初始化各个模块
    initModules() {
        // 初始化地图核心模块
        MapCore.init();
        
        // 初始化信息面板
        InfoPanel.init();
        
        // 初始化搜索模块
        SearchModule.init();
        
        // 初始化路线规划模块
        RouteModule.init();
        
        // 初始化轨迹模块
        TrackModule.init();
        
        // 初始化帮助文档模块
        HelpModal.init();
        
        console.log('所有模块初始化完成');
    },
    
    // 获取应用版本信息
    getVersion() {
        return '1.0.0';
    },
    
    // 显示Canvas性能优化统计
    showCanvasOptimizationStats() {
        // 延迟执行，确保地图完全加载
        setTimeout(() => {
            if (window.CanvasOptimizer) {
                const stats = CanvasOptimizer.getPerformanceStats();
                console.log('Canvas性能优化统计:', stats);
                
                if (stats.total > 0) {
                    const message = `Canvas优化: ${stats.optimized}/${stats.total} (${stats.percentage}%)`;
                    MessageUtils.show(message, stats.percentage > 50 ? 'success' : 'warning');
                }
            }
        }, 3000);
    },
    
    // 获取应用信息
    getInfo() {
        return {
            name: '高德地图应用',
            version: this.getVersion(),
            author: 'MapApp Team',
            description: '基于高德地图API的综合地图应用，支持搜索、路线规划、轨迹记录等功能'
        };
    }
};

// DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', function() {
    // 检查高德地图API是否加载完成
    if (typeof AMap === 'undefined') {
        console.error('高德地图API未加载');
        MessageUtils.show('高德地图API加载失败，请检查网络连接', 'error');
        return;
    }
    
    // 初始化应用
    MapApp.init();
});

// 全局错误处理
window.addEventListener('error', function(event) {
    console.error('全局错误：', event.error);
    MessageUtils.show('应用发生错误，请刷新页面重试', 'error');
});

// 全局未处理的Promise拒绝
window.addEventListener('unhandledrejection', function(event) {
    console.error('未处理的Promise拒绝：', event.reason);
    MessageUtils.show('应用发生异步错误', 'error');
    event.preventDefault();
});

// 导出到全局作用域（用于调试）
window.MapApp = MapApp;
window.MapCore = MapCore;
window.SearchModule = SearchModule;
window.RouteModule = RouteModule;
window.TrackModule = TrackModule;
window.Utils = Utils;
window.MessageUtils = MessageUtils;
window.LoadingUtils = LoadingUtils;
window.StorageUtils = StorageUtils;