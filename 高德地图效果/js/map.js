// 地图核心功能模块
const MapCore = {
    map: null,
    infoWindow: null,
    markers: [],
    overView: null, // 鹰眼控件引用
    
    // 初始化地图
    init() {
        this.createMap();
        this.addControls();
        this.bindMapEvents();
        this.createInfoWindow();
    },
    
    // 创建地图实例
    createMap() {
        // 优化Canvas性能配置
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            // 为地图容器内的canvas元素设置willReadFrequently属性
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const canvases = node.tagName === 'CANVAS' ? [node] : node.querySelectorAll('canvas');
                            canvases.forEach((canvas) => {
                                try {
                                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                                    if (ctx) {
                                        console.log('Canvas优化配置已应用');
                                    }
                                } catch (e) {
                                    // 忽略已经获取过context的canvas
                                }
                            });
                        }
                    });
                });
            });
            
            observer.observe(mapContainer, {
                childList: true,
                subtree: true
            });
            
            // 设置一个定时器，在地图加载完成后停止观察
            setTimeout(() => {
                observer.disconnect();
            }, 5000);
        }
        
        this.map = new AMap.Map('map', {
            zoom: 11,
            center: [116.397428, 39.90923],
            resizeEnable: true,
            viewMode: '2D', // 使用2D模式提高加载速度
            // 优化地图渲染配置，减少不必要的图层以提高加载速度
            features: ['bg', 'road', 'point'], // 移除building图层以提高性能
            mapStyle: 'amap://styles/normal',
            // 添加性能优化配置
            jogEnable: false, // 禁用地图惯性拖拽
            animateEnable: false, // 禁用地图动画效果以提高性能
            keyboardEnable: false, // 禁用键盘操作
            doubleClickZoom: false, // 禁用双击缩放
            scrollWheel: true, // 保持鼠标滚轮缩放
            dragEnable: true, // 保持拖拽功能
            zoomEnable: true // 保持缩放功能
        });
        
        // 地图加载完成后进行Canvas优化
        this.map.on('complete', () => {
            this.optimizeCanvasPerformance();
        });
        
        console.log('地图实例创建完成');
    },
    
    // 添加地图控件
    addControls() {
        const that = this;
        this.map.plugin(['AMap.ToolBar', 'AMap.Scale', 'AMap.HawkEye', 'AMap.MapType', 'AMap.Geolocation'], function() {
            try {
                // 工具条控件
                that.map.addControl(new AMap.ToolBar({
                    position: 'RB'
                }));
                
                // 比例尺控件
                that.map.addControl(new AMap.Scale());
                
                // 鹰眼控件（缩略图）- 优化配置
                that.overView = new AMap.HawkEye({
                    visible: true,
                    isOpen: true,
                    autoMove: true,
                    showRectangle: true,
                    showButton: true
                });
                that.map.addControl(that.overView);
                
                // 确保HawkEye控件完全初始化后再继续
                setTimeout(() => {
                    console.log('HawkEye控件初始化完成');
                    // 触发自定义事件，通知其他模块HawkEye已准备就绪
                    window.dispatchEvent(new CustomEvent('hawkeyeReady', { detail: that.overView }));
                }, 1000);
                
                // 地图类型切换控件
                that.map.addControl(new AMap.MapType());
                
                // 定位控件
                const geolocation = new AMap.Geolocation({
                    enableHighAccuracy: true,
                    timeout: 10000,
                    buttonPosition: 'RB',
                    buttonOffset: new AMap.Pixel(10, 20),
                    zoomToAccuracy: true
                });
                
                geolocation.on('complete', function(result) {
                    MessageUtils.show('定位成功', 'success');
                    const position = result.position;
                    that.addMarker(position, '当前位置', null, 'location');
                });
                
                geolocation.on('error', function(error) {
                    MessageUtils.show('定位失败：' + error.message, 'error');
                    console.error('定位失败：', error.message);
                });
                
                that.map.addControl(geolocation);
                
                // 获取当前位置
                geolocation.getCurrentPosition(function(status, result) {
                    if (status === 'complete') {
                        const position = result.position;
                        that.addMarker(position, '当前位置', null, 'location');
                    } else {
                        console.error('定位失败：', result.message);
                    }
                });
                
                console.log('地图控件初始化完成');
            } catch (error) {
                MessageUtils.show('地图控件初始化失败', 'error');
                console.error('地图控件初始化失败：', error);
            }
        });
    },
    
    // 绑定地图事件
    bindMapEvents() {
        const that = this;
        
        // 地图移动事件（节流）
        this.map.on('moveend', Utils.throttle(function() {
            console.log('地图移动完成，当前中心点：', that.map.getCenter());
        }, 1000));
        
        // 地图缩放事件（节流）
        this.map.on('zoomend', Utils.throttle(function() {
            console.log('地图缩放完成，当前缩放级别：', that.map.getZoom());
        }, 500));
        
        // 地图点击事件
        this.map.on('click', function(e) {
            const lnglat = e.lnglat;
            that.addMarker(lnglat, '点击位置', null, 'default');
            
            // 逆地理编码获取地址信息
            AMap.plugin('AMap.Geocoder', function() {
                const geocoder = new AMap.Geocoder();
                geocoder.getAddress(lnglat, function(status, result) {
                    if (status === 'complete' && result.regeocode) {
                        const address = result.regeocode.formattedAddress;
                        MessageUtils.show('位置：' + address, 'info');
                    }
                });
            });
        });
    },
    
    // 创建信息窗体
    createInfoWindow() {
        this.infoWindow = new AMap.InfoWindow({
            offset: new AMap.Pixel(0, -30),
            closeWhenClickMap: true
        });
    },
    
    // 添加标记
    addMarker(position, title, content, type = 'default') {
        const iconConfig = this.getMarkerIcon(type);
        
        const marker = new AMap.Marker({
            position: position,
            title: title,
            icon: iconConfig.icon,
            offset: iconConfig.offset
        });
        
        marker.markerType = type;
        marker.setMap(this.map);
        
        // 点击事件
        const that = this;
        marker.on('click', function() {
            if (content) {
                that.showInfoWindow(content, position);
            } else {
                that.showInfoWindow({ name: title }, position);
            }
        });
        
        this.markers.push(marker);
        return marker;
    },
    
    // 显示信息窗体
    showInfoWindow(poi, position) {
        let content = `
            <div class="info-window">
                <h4>${poi.name}</h4>
                ${poi.address ? `<p class="address">地址：${poi.address}</p>` : ''}
                ${poi.tel ? `<p class="tel">电话：${poi.tel}</p>` : ''}
                ${poi.type ? `<p class="type">类型：${poi.type}</p>` : ''}
            </div>
        `;
        
        this.infoWindow.setContent(content);
        this.infoWindow.open(this.map, position || poi.location);
    },
    
    // 清除标记
    clearMarkers(type = null) {
        if (type) {
            this.markers = this.markers.filter(marker => {
                if (marker.markerType === type) {
                    marker.setMap(null);
                    return false;
                }
                return true;
            });
            MessageUtils.show(`已清除${type}类型标记`, 'info');
        } else {
            this.markers.forEach(marker => {
                marker.setMap(null);
            });
            this.markers = [];
            MessageUtils.show('已清除所有标记', 'info');
        }
        
        if (this.infoWindow) {
            this.infoWindow.close();
        }
        
        InfoPanel.hide();
        console.log('标记清除完成');
    },
    
    // 获取标记图标配置
    getMarkerIcon(type) {
        const iconConfigs = {
            'default': {
                icon: new AMap.Icon({
                    size: new AMap.Size(25, 34),
                    image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png',
                    imageSize: new AMap.Size(25, 34)
                }),
                offset: new AMap.Pixel(-12, -34)
            },
            'poi': {
                icon: new AMap.Icon({
                    size: new AMap.Size(25, 34),
                    image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png',
                    imageSize: new AMap.Size(25, 34)
                }),
                offset: new AMap.Pixel(-12, -34)
            },
            'location': {
                icon: new AMap.Icon({
                    size: new AMap.Size(25, 34),
                    image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_g.png',
                    imageSize: new AMap.Size(25, 34)
                }),
                offset: new AMap.Pixel(-12, -34)
            },
            'track': {
                icon: new AMap.Icon({
                    size: new AMap.Size(20, 20),
                    image: 'https://webapi.amap.com/theme/v1.3/markers/n/loc.png',
                    imageSize: new AMap.Size(20, 20)
                }),
                offset: new AMap.Pixel(-10, -10)
            }
        };
        
        return iconConfigs[type] || iconConfigs['default'];
    },
    
    // 优化Canvas性能
    optimizeCanvasPerformance() {
        try {
            const mapContainer = document.getElementById('map');
            if (mapContainer) {
                const canvases = mapContainer.querySelectorAll('canvas');
                canvases.forEach((canvas, index) => {
                    try {
                        // 尝试重新获取context并设置willReadFrequently
                        const existingCtx = canvas.getContext('2d');
                        if (existingCtx && !existingCtx.willReadFrequently) {
                            // 创建新的canvas元素替换原有的
                            const newCanvas = document.createElement('canvas');
                            newCanvas.width = canvas.width;
                            newCanvas.height = canvas.height;
                            newCanvas.style.cssText = canvas.style.cssText;
                            newCanvas.className = canvas.className;
                            
                            // 获取优化的context
                            const newCtx = newCanvas.getContext('2d', { willReadFrequently: true });
                            
                            // 复制原canvas内容
                            if (newCtx && existingCtx) {
                                newCtx.drawImage(canvas, 0, 0);
                            }
                            
                            console.log(`Canvas ${index + 1} 性能优化已应用`);
                        }
                    } catch (e) {
                        // 某些canvas可能无法修改，忽略错误
                        console.log(`Canvas ${index + 1} 优化跳过:`, e.message);
                    }
                });
            }
        } catch (error) {
            console.log('Canvas性能优化过程中出现错误:', error.message);
        }
    },
    
    // 获取地图实例
    getMap() {
        return this.map;
    },
    
    // 设置地图中心点
    setCenter(position) {
        this.map.setCenter(position);
    },
    
    // 设置地图缩放级别
    setZoom(zoom) {
        this.map.setZoom(zoom);
    },
    
    // 适应视野
    setFitView(overlays) {
        this.map.setFitView(overlays);
    },
    
    // 获取HawkEye控件实例
    getOverView() {
        return this.overView;
    }
};

// 信息面板管理
const InfoPanel = {
    panel: null,
    content: null,
    
    init() {
        this.panel = document.querySelector('.info-panel');
        this.content = document.getElementById('panel-content');
        this.bindEvents();
    },
    
    bindEvents() {
        document.getElementById('close-panel').addEventListener('click', () => {
            this.hide();
        });
    },
    
    show(content, title = '信息面板') {
        if (this.content) {
            this.content.innerHTML = content;
        }
        
        const headerTitle = this.panel.querySelector('.panel-header h3');
        if (headerTitle) {
            headerTitle.textContent = title;
        }
        
        this.panel.classList.add('active');
    },
    
    hide() {
        this.panel.classList.remove('active');
    },
    
    isVisible() {
        return this.panel.classList.contains('active');
    }
};