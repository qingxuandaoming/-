// 轨迹功能模块
const TrackModule = {
    trackRecording: false,
    trackPoints: [],
    trackPolyline: null,
    trackStartTime: null,
    trackTimer: null,
    trackTotalDistance: 0,
    geolocation: null,
    watchId: null,
    
    // 轨迹动画相关
    animationMarker: null,
    passedPolyline: null,
    isAnimating: false,
    animationSpeed: 100, // 动画速度（毫秒）
    totalAnimationDuration: 1000, // 总动画时长（10秒）
    
    // 缩略图轨迹相关
    overViewPolyline: null,
    simplifiedTrackPolyline: null,
    
    // 初始化轨迹功能
    init() {
        this.initTrackingSystem();
        this.bindEvents();
    },
    
    // 初始化轨迹系统
    initTrackingSystem() {
        try {
            if (!navigator.geolocation) {
                throw new Error('浏览器不支持定位功能');
            }
            
            this.geolocation = new AMap.Geolocation({
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });
            
            this.trackPoints = [];
            this.trackPolyline = null;
            this.trackStartTime = null;
            this.trackTotalDistance = 0;
            this.trackTimer = null;
            this.watchId = null;
            
            console.log('轨迹系统初始化完成');
        } catch (error) {
            MessageUtils.show('轨迹系统初始化失败：' + error.message, 'error');
            console.error('轨迹系统初始化失败：', error);
            
            // 禁用轨迹相关按钮
            const trackButtons = ['start-track-btn', 'stop-track-btn', 'clear-track-btn', 'save-track-btn', 'load-track-btn'];
            trackButtons.forEach(btnId => {
                const btn = document.getElementById(btnId);
                if (btn) {
                    btn.disabled = true;
                    btn.title = '轨迹功能不可用：' + error.message;
                }
            });
        }
    },
    
    // 绑定轨迹事件
    bindEvents() {
        const that = this;
        
        // 开始记录轨迹
        document.getElementById('start-track-btn').addEventListener('click', function() {
            that.startTracking();
        });
        
        // 停止记录轨迹
        document.getElementById('stop-track-btn').addEventListener('click', function() {
            that.stopTracking();
        });
        
        // 清除轨迹
        document.getElementById('clear-track-btn').addEventListener('click', function() {
            that.clearTrack();
        });
        
        // 保存轨迹
        document.getElementById('save-track-btn').addEventListener('click', function() {
            that.saveTrack();
        });
        
        // 加载轨迹
        document.getElementById('load-track-btn').addEventListener('click', function() {
            document.getElementById('track-file-input').click();
        });
        
        // 加载预设轨迹
        document.getElementById('demo-track-btn').addEventListener('click', function() {
            that.loadDemoTrack();
        });
        
        // 播放轨迹动画
        document.getElementById('play-track-btn').addEventListener('click', function() {
            // 如果有暂停的动画，则恢复播放；否则开始新的播放
            if (that.animationMarker && !that.isAnimating) {
                that.resumeTrackAnimation();
            } else {
                that.startTrackAnimation();
            }
        });
        
        // 暂停轨迹动画
        document.getElementById('pause-track-btn').addEventListener('click', function() {
            if (that.isAnimating) {
                that.pauseTrackAnimation();
            } else {
                that.resumeTrackAnimation();
            }
        });
        
        // 停止轨迹动画
        document.getElementById('stop-animation-btn').addEventListener('click', function() {
            that.stopTrackAnimation();
        });
        
        // 文件选择事件
        document.getElementById('track-file-input').addEventListener('change', function(e) {
            that.loadTrack(e.target.files[0]);
        });
    },
    
    // 开始记录轨迹
    startTracking() {
        if (this.trackRecording) {
            MessageUtils.show('轨迹记录已在进行中', 'warning');
            return;
        }
        
        try {
            this.trackRecording = true;
            this.trackStartTime = new Date();
            this.trackPoints = [];
            this.trackTotalDistance = 0;
            
            // 更新UI状态
            this.updateTrackingUI();
            
            // 开始定时器
            this.startTimer();
            
            // 开始监听位置变化
            this.startLocationWatch();
            
            MessageUtils.show('开始记录轨迹', 'success');
            console.log('轨迹记录开始');
        } catch (error) {
            this.trackRecording = false;
            MessageUtils.show('开始轨迹记录失败：' + error.message, 'error');
            console.error('开始轨迹记录失败：', error);
        }
    },
    
    // 停止记录轨迹
    stopTracking() {
        if (!this.trackRecording) {
            MessageUtils.show('当前没有在记录轨迹', 'warning');
            return;
        }
        
        try {
            this.trackRecording = false;
            
            // 停止定时器
            this.stopTimer();
            
            // 停止位置监听
            this.stopLocationWatch();
            
            // 更新UI状态
            this.updateTrackingUI();
            
            MessageUtils.show(`轨迹记录完成，共记录 ${this.trackPoints.length} 个点`, 'success');
            console.log('轨迹记录停止，共', this.trackPoints.length, '个点');
        } catch (error) {
            MessageUtils.show('停止轨迹记录失败：' + error.message, 'error');
            console.error('停止轨迹记录失败：', error);
        }
    },
    
    // 清除轨迹
    clearTrack() {
        try {
            // 如果正在记录，先停止
            if (this.trackRecording) {
                this.stopTracking();
            }
            
            // 清除轨迹数据
            this.trackPoints = [];
            this.trackTotalDistance = 0;
            this.trackStartTime = null;
            
            // 清除地图上的轨迹线
            if (this.trackPolyline) {
                this.trackPolyline.setMap(null);
                this.trackPolyline = null;
            }
            
            // 清除缩略图中的轨迹线
            if (this.overViewPolyline) {
                this.overViewPolyline.setMap(null);
                this.overViewPolyline = null;
            }
            
            // 清除简化轨迹线
            if (this.simplifiedTrackPolyline) {
                this.simplifiedTrackPolyline.setMap(null);
                this.simplifiedTrackPolyline = null;
            }
            
            // 清除轨迹标记
            MapCore.clearMarkers('track');
            
            // 重置UI
            this.resetTrackingUI();
            
            MessageUtils.show('轨迹已清除', 'success');
            console.log('轨迹已清除');
        } catch (error) {
            MessageUtils.show('清除轨迹失败：' + error.message, 'error');
            console.error('清除轨迹失败：', error);
        }
    },
    
    // 开始位置监听
    startLocationWatch() {
        const that = this;
        
        if (navigator.geolocation) {
            this.watchId = navigator.geolocation.watchPosition(
                function(position) {
                    that.addTrackPoint(position);
                },
                function(error) {
                    console.error('定位失败：', error.message);
                    MessageUtils.show('定位失败：' + error.message, 'error');
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 5000
                }
            );
        }
    },
    
    // 停止位置监听
    stopLocationWatch() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
    },
    
    // 添加轨迹点
    addTrackPoint(position) {
        try {
            const lng = position.coords.longitude;
            const lat = position.coords.latitude;
            const timestamp = new Date(position.timestamp);
            
            // 验证坐标数据
            if (typeof lng !== 'number' || typeof lat !== 'number' || 
                isNaN(lng) || isNaN(lat) ||
                lng < -180 || lng > 180 || lat < -90 || lat > 90) {
                console.warn('无效的坐标数据：', lng, lat);
                return;
            }
            
            const point = {
                lng: lng,
                lat: lat,
                timestamp: timestamp,
                accuracy: position.coords.accuracy
            };
            
            // 计算与上一个点的距离
            if (this.trackPoints.length > 0) {
                const lastPoint = this.trackPoints[this.trackPoints.length - 1];
                const distance = this.calculateDistance(lastPoint, point);
                
                // 过滤掉距离太近的点（小于5米）
                if (distance < 0.005) {
                    return;
                }
                
                this.trackTotalDistance += distance;
            }
            
            this.trackPoints.push(point);
            
            // 更新轨迹线
            this.updateTrackPolyline();
            
            // 更新距离显示
            this.updateTrackDistance();
            
            console.log('添加轨迹点：', point);
        } catch (error) {
            console.error('添加轨迹点失败：', error);
        }
    },
    
    // 更新轨迹线
    updateTrackPolyline() {
        if (this.trackPoints.length < 2) {
            return;
        }
        
        try {
            // 验证并过滤有效的坐标点
            const validPath = this.trackPoints
                .filter(point => {
                    return point && 
                           typeof point.lng === 'number' && 
                           typeof point.lat === 'number' &&
                           !isNaN(point.lng) && 
                           !isNaN(point.lat) &&
                           isFinite(point.lng) &&
                           isFinite(point.lat) &&
                           point.lng >= -180 && point.lng <= 180 &&
                           point.lat >= -90 && point.lat <= 90;
                })
                .map(point => {
                    // 确保坐标精度合理，避免过高精度导致的问题
                    const lng = Math.round(point.lng * 1000000) / 1000000;
                    const lat = Math.round(point.lat * 1000000) / 1000000;
                    return [lng, lat];
                });
            
            if (validPath.length < 2) {
                console.warn('有效轨迹点数量不足，无法绘制轨迹线');
                return;
            }
            
            if (this.trackPolyline) {
                try {
                    this.trackPolyline.setPath(validPath);
                } catch (pathError) {
                    console.warn('设置轨迹路径失败，重新创建轨迹线：', pathError);
                    this.trackPolyline.setMap(null);
                    this.trackPolyline = null;
                }
            }
            
            if (!this.trackPolyline) {
                try {
                    this.trackPolyline = new AMap.Polyline({
                        path: validPath,
                        strokeColor: '#FF0000',
                        strokeWeight: 4,
                        strokeOpacity: 0.8,
                        strokeStyle: 'solid'
                    });
                    this.trackPolyline.setMap(MapCore.getMap());
                } catch (createError) {
                    console.error('创建轨迹线失败：', createError);
                    throw createError;
                }
            }
            
            // 同时在缩略图中显示轨迹
            this.addTrackToOverView(validPath);
        } catch (error) {
            console.error('更新轨迹线失败：', error);
            MessageUtils.show('轨迹线绘制失败：' + error.message, 'error');
        }
    },
    
    // 计算两点间距离（公里）
    calculateDistance(point1, point2) {
        const R = 6371; // 地球半径（公里）
        const dLat = this.toRadians(point2.lat - point1.lat);
        const dLng = this.toRadians(point2.lng - point1.lng);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(this.toRadians(point1.lat)) * Math.cos(this.toRadians(point2.lat)) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    },
    
    // 角度转弧度
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    },
    
    // 开始计时器
    startTimer() {
        const that = this;
        this.trackTimer = setInterval(function() {
            that.updateTrackTime();
        }, 1000);
    },
    
    // 停止计时器
    stopTimer() {
        if (this.trackTimer) {
            clearInterval(this.trackTimer);
            this.trackTimer = null;
        }
    },
    
    // 更新轨迹UI状态
    updateTrackingUI() {
        const startBtn = document.getElementById('start-track-btn');
        const stopBtn = document.getElementById('stop-track-btn');
        const saveBtn = document.getElementById('save-track-btn');
        const statusEl = document.getElementById('track-status');
        
        if (this.trackRecording) {
            startBtn.disabled = true;
            stopBtn.disabled = false;
            saveBtn.disabled = true;
            statusEl.textContent = '正在记录轨迹...';
            statusEl.style.color = '#dc3545';
        } else {
            startBtn.disabled = false;
            stopBtn.disabled = true;
            saveBtn.disabled = this.trackPoints.length === 0;
            statusEl.textContent = this.trackPoints.length > 0 ? '轨迹记录完成' : '未开始记录';
            statusEl.style.color = this.trackPoints.length > 0 ? '#28a745' : '#6c757d';
        }
    },
    
    // 重置轨迹UI
    resetTrackingUI() {
        document.getElementById('start-track-btn').disabled = false;
        document.getElementById('stop-track-btn').disabled = true;
        document.getElementById('save-track-btn').disabled = true;
        document.getElementById('track-status').textContent = '未开始记录';
        document.getElementById('track-status').style.color = '#6c757d';
        document.getElementById('track-distance').textContent = '距离: 0 km';
        document.getElementById('track-time').textContent = '时间: 00:00:00';
    },
    
    // 更新距离显示
    updateTrackDistance() {
        const distanceEl = document.getElementById('track-distance');
        distanceEl.textContent = `距离: ${this.trackTotalDistance.toFixed(2)} km`;
    },
    
    // 更新时间显示
    updateTrackTime() {
        if (!this.trackStartTime) return;
        
        const now = new Date();
        const duration = Math.floor((now - this.trackStartTime) / 1000);
        const hours = Math.floor(duration / 3600);
        const minutes = Math.floor((duration % 3600) / 60);
        const seconds = duration % 60;
        
        const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('track-time').textContent = `时间: ${timeStr}`;
    },
    
    // 保存轨迹
    saveTrack() {
        if (this.trackPoints.length === 0) {
            MessageUtils.show('没有轨迹数据可保存', 'warning');
            return;
        }
        
        try {
            const trackData = {
                points: this.trackPoints,
                totalDistance: this.trackTotalDistance,
                startTime: this.trackStartTime,
                endTime: new Date(),
                pointCount: this.trackPoints.length
            };
            
            const dataStr = JSON.stringify(trackData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `track_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            MessageUtils.show('轨迹保存成功', 'success');
            console.log('轨迹已保存');
        } catch (error) {
            MessageUtils.show('轨迹保存失败', 'error');
            console.error('保存轨迹时出错：', error);
        }
    },
    
    // 加载轨迹
    loadTrack(file) {
        if (!file) return;
        
        const reader = new FileReader();
        const that = this;
        
        reader.onload = function(e) {
            try {
                const trackData = JSON.parse(e.target.result);
                that.displayLoadedTrack(trackData);
            } catch (error) {
                MessageUtils.show('轨迹文件格式错误', 'error');
                console.error('轨迹加载失败：', error);
            }
        };
        
        reader.readAsText(file);
    },
    
    // 加载预设轨迹
    loadDemoTrack() {
        MessageUtils.show('正在生成真实道路轨迹...', 'info');
        this.generateRealRouteTrack();
    },
    
    // 生成真实道路轨迹
    generateRealRouteTrack() {
        // 使用北京地区的真实地点
        const startPoint = new AMap.LngLat(116.397428, 39.90923); // 天安门
        const endPoint = new AMap.LngLat(116.473168, 39.993015);   // 鸟巢
        
        // 确保路线规划服务已初始化
        if (!RouteModule.driving) {
            MessageUtils.show('路线规划服务未初始化，使用默认轨迹', 'warning');
            this.loadDefaultTrack();
            return;
        }
        
        // 使用驾车路线规划获取真实道路轨迹
        RouteModule.driving.search(startPoint, endPoint, (status, result) => {
            if (status === 'complete' && result.routes && result.routes.length > 0) {
                const route = result.routes[0];
                const trackData = this.convertRouteToTrackData(route);
                
                this.displayLoadedTrack(trackData);
                MessageUtils.show('真实道路轨迹生成成功，点击播放按钮开始动画回放', 'success');
            } else {
                MessageUtils.show('路线规划失败，使用默认轨迹', 'warning');
                this.loadDefaultTrack();
            }
        });
    },
    
    // 将路线数据转换为轨迹数据
    convertRouteToTrackData(route) {
        const points = [];
        const startTime = new Date('2024-01-01T09:00:00');
        let currentTime = new Date(startTime);
        
        try {
            // 提取路线中的所有坐标点
            if (route.steps && route.steps.length > 0) {
                route.steps.forEach(step => {
                    if (step.path && step.path.length > 0) {
                        step.path.forEach((lngLat, index) => {
                            // 验证坐标数据
                            if (lngLat && 
                                typeof lngLat.lng === 'number' && 
                                typeof lngLat.lat === 'number' &&
                                !isNaN(lngLat.lng) && 
                                !isNaN(lngLat.lat) &&
                                lngLat.lng >= -180 && lngLat.lng <= 180 &&
                                lngLat.lat >= -90 && lngLat.lat <= 90) {
                                
                                // 每隔几个点取一个，避免点太密集
                                if (index % 3 === 0) {
                                    points.push({
                                        lng: lngLat.lng,
                                        lat: lngLat.lat,
                                        timestamp: new Date(currentTime)
                                    });
                                    // 每个点间隔30秒
                                    currentTime = new Date(currentTime.getTime() + 30000);
                                }
                            }
                        });
                    }
                });
            }
            
            // 如果没有获取到足够的点，使用路线的整体路径
            if (points.length < 10 && route.path && route.path.length > 0) {
                points.length = 0; // 清空之前的点
                currentTime = new Date(startTime);
                
                route.path.forEach((lngLat, index) => {
                    // 验证坐标数据
                    if (lngLat && 
                        typeof lngLat.lng === 'number' && 
                        typeof lngLat.lat === 'number' &&
                        !isNaN(lngLat.lng) && 
                        !isNaN(lngLat.lat) &&
                        lngLat.lng >= -180 && lngLat.lng <= 180 &&
                        lngLat.lat >= -90 && lngLat.lat <= 90) {
                        
                        // 每隔几个点取一个
                        if (index % 5 === 0) {
                            points.push({
                                lng: lngLat.lng,
                                lat: lngLat.lat,
                                timestamp: new Date(currentTime)
                            });
                            currentTime = new Date(currentTime.getTime() + 30000);
                        }
                    }
                });
            }
            
            // 确保至少有2个有效点
            if (points.length < 2) {
                console.warn('路线数据转换失败，点数量不足');
                // 返回默认的两个点
                return {
                    points: [
                        { lng: 116.397428, lat: 39.90923, timestamp: startTime },
                        { lng: 116.398428, lat: 39.91023, timestamp: new Date(startTime.getTime() + 60000) }
                    ],
                    startTime: startTime,
                    endTime: new Date(startTime.getTime() + 60000),
                    totalDistance: 0.1
                };
            }
            
            const endTime = new Date(currentTime.getTime() - 30000);
            const totalDistance = route.distance ? (route.distance / 1000).toFixed(2) : '0.00';
            
            return {
                points: points,
                startTime: startTime,
                endTime: endTime,
                totalDistance: parseFloat(totalDistance)
            };
        } catch (error) {
            console.error('路线数据转换失败：', error);
            // 返回默认数据
            return {
                points: [
                    { lng: 116.397428, lat: 39.90923, timestamp: startTime },
                    { lng: 116.398428, lat: 39.91023, timestamp: new Date(startTime.getTime() + 60000) }
                ],
                startTime: startTime,
                endTime: new Date(startTime.getTime() + 60000),
                totalDistance: 0.1
            };
        }
    },
    
    // 加载默认轨迹（备用方案）
    loadDefaultTrack() {
        const demoTrackData = {
            points: [
                { lng: 116.397428, lat: 39.90923, timestamp: new Date('2024-01-01T09:00:00') },
                { lng: 116.398748, lat: 39.909025, timestamp: new Date('2024-01-01T09:00:30') },
                { lng: 116.400068, lat: 39.908820, timestamp: new Date('2024-01-01T09:01:00') },
                { lng: 116.401388, lat: 39.908615, timestamp: new Date('2024-01-01T09:01:30') },
                { lng: 116.402708, lat: 39.908410, timestamp: new Date('2024-01-01T09:02:00') },
                { lng: 116.404028, lat: 39.908205, timestamp: new Date('2024-01-01T09:02:30') },
                { lng: 116.405348, lat: 39.908000, timestamp: new Date('2024-01-01T09:03:00') },
                { lng: 116.406668, lat: 39.907795, timestamp: new Date('2024-01-01T09:03:30') },
                { lng: 116.407988, lat: 39.907590, timestamp: new Date('2024-01-01T09:04:00') },
                { lng: 116.409308, lat: 39.907385, timestamp: new Date('2024-01-01T09:04:30') },
                { lng: 116.410628, lat: 39.907180, timestamp: new Date('2024-01-01T09:05:00') },
                { lng: 116.411948, lat: 39.906975, timestamp: new Date('2024-01-01T09:05:30') },
                { lng: 116.413268, lat: 39.906770, timestamp: new Date('2024-01-01T09:06:00') },
                { lng: 116.414588, lat: 39.906565, timestamp: new Date('2024-01-01T09:06:30') },
                { lng: 116.415908, lat: 39.906360, timestamp: new Date('2024-01-01T09:07:00') },
                { lng: 116.417228, lat: 39.906155, timestamp: new Date('2024-01-01T09:07:30') },
                { lng: 116.418548, lat: 39.905950, timestamp: new Date('2024-01-01T09:08:00') },
                { lng: 116.419868, lat: 39.905745, timestamp: new Date('2024-01-01T09:08:30') },
                { lng: 116.421188, lat: 39.905540, timestamp: new Date('2024-01-01T09:09:00') },
                { lng: 116.422508, lat: 39.905335, timestamp: new Date('2024-01-01T09:09:30') },
                { lng: 116.423828, lat: 39.905130, timestamp: new Date('2024-01-01T09:10:00') },
                { lng: 116.425148, lat: 39.904925, timestamp: new Date('2024-01-01T09:10:30') },
                { lng: 116.426468, lat: 39.904720, timestamp: new Date('2024-01-01T09:11:00') },
                { lng: 116.427788, lat: 39.904515, timestamp: new Date('2024-01-01T09:11:30') },
                { lng: 116.429108, lat: 39.904310, timestamp: new Date('2024-01-01T09:12:00') }
            ],
            startTime: new Date('2024-01-01T09:00:00'),
            endTime: new Date('2024-01-01T09:12:00'),
            totalDistance: 3.2
        };
        
        this.displayLoadedTrack(demoTrackData);
        MessageUtils.show('预设轨迹加载成功，点击播放按钮开始动画回放', 'success');
    },
    
    // 显示加载的轨迹
    displayLoadedTrack(trackData) {
        try {
            this.clearTrack();
            
            if (!trackData || typeof trackData !== 'object') {
                throw new Error('轨迹数据格式无效');
            }
            
            this.trackPoints = trackData.points || [];
            this.trackTotalDistance = trackData.totalDistance || 0;
            
            if (this.trackPoints.length === 0) {
                MessageUtils.show('轨迹文件中没有有效数据', 'warning');
                return;
            }
            
            const validPoints = this.trackPoints.filter(point => 
                point && typeof point.lng === 'number' && typeof point.lat === 'number'
            );
            
            if (validPoints.length !== this.trackPoints.length) {
                MessageUtils.show(`轨迹数据中有 ${this.trackPoints.length - validPoints.length} 个无效点已被过滤`, 'warning');
                this.trackPoints = validPoints;
            }
            
            if (this.trackPoints.length === 0) {
                MessageUtils.show('没有有效的轨迹点数据', 'error');
                return;
            }
            
            this.updateTrackPolyline();
            this.updateTrackDistance();
            
            // 在缩略图中也显示轨迹
            const trackPath = this.trackPoints.map(point => [point.lng, point.lat]);
            this.addTrackToOverView(trackPath);
            
            if (trackData.startTime && trackData.endTime) {
                const duration = Math.floor((new Date(trackData.endTime) - new Date(trackData.startTime)) / 1000);
                const hours = Math.floor(duration / 3600);
                const minutes = Math.floor((duration % 3600) / 60);
                const seconds = duration % 60;
                const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                document.getElementById('track-time').textContent = `时间: ${timeStr}`;
            }
            
            document.getElementById('track-status').textContent = `已加载轨迹 (${this.trackPoints.length} 个点)`;
            document.getElementById('save-track-btn').disabled = false;
            
            // 更新动画控制UI
            this.updateAnimationUI();
            
            if (this.trackPolyline) {
                MapCore.setFitView([this.trackPolyline]);
            }
            
            MessageUtils.show(`轨迹加载成功，共 ${this.trackPoints.length} 个点，已在缩略图中显示`, 'success');
            console.log('轨迹加载完成，共', this.trackPoints.length, '个点，已同步到缩略图');
        } catch (error) {
            MessageUtils.show('轨迹加载失败：' + error.message, 'error');
            console.error('轨迹加载失败：', error);
        }
    },
    
    // 开始轨迹动画
    startTrackAnimation() {
        if (this.trackPoints.length < 2) {
            MessageUtils.show('轨迹点数量不足，无法播放动画', 'warning');
            return;
        }
        
        if (this.isAnimating) {
            MessageUtils.show('动画正在播放中', 'warning');
            return;
        }
        
        try {
            // 验证轨迹点数据
            const validPoints = this.trackPoints.filter(point => {
                return point && 
                       typeof point.lng === 'number' && 
                       typeof point.lat === 'number' &&
                       !isNaN(point.lng) && 
                       !isNaN(point.lat) &&
                       point.lng >= -180 && point.lng <= 180 &&
                       point.lat >= -90 && point.lat <= 90;
            });
            
            if (validPoints.length < 2) {
                MessageUtils.show('有效轨迹点数量不足，无法播放动画', 'warning');
                return;
            }
            
            // 更新有效轨迹点
            this.trackPoints = validPoints;
            
            // 加载动画插件
            AMap.plugin('AMap.MoveAnimation', () => {
                try {
                    this.createAnimationMarker();
                    this.createPassedPolyline();
                    this.playAnimation();
                } catch (pluginError) {
                    console.error('动画插件加载失败：', pluginError);
                    MessageUtils.show('动画插件加载失败，请刷新页面重试', 'error');
                }
            });
        } catch (error) {
            MessageUtils.show('启动轨迹动画失败：' + error.message, 'error');
            console.error('轨迹动画失败：', error);
        }
    },
    
    // 创建动画标记
    createAnimationMarker() {
        if (this.animationMarker) {
            this.animationMarker.setMap(null);
            this.animationMarker = null;
        }
        
        if (this.trackPoints.length === 0) {
            MessageUtils.show('没有轨迹数据', 'warning');
            return;
        }
        
        const startPoint = this.trackPoints[0];
        
        // 验证起始点坐标的有效性
        if (!startPoint || 
            typeof startPoint.lng !== 'number' || 
            typeof startPoint.lat !== 'number' ||
            isNaN(startPoint.lng) || 
            isNaN(startPoint.lat) ||
            !isFinite(startPoint.lng) ||
            !isFinite(startPoint.lat) ||
            startPoint.lng < -180 || startPoint.lng > 180 ||
            startPoint.lat < -90 || startPoint.lat > 90) {
            MessageUtils.show('起始点坐标无效', 'error');
            console.error('起始点坐标无效：', startPoint);
            return;
        }
        
        this.animationMarker = new AMap.Marker({
            map: MapCore.getMap(),
            position: [startPoint.lng, startPoint.lat],
            icon: 'https://webapi.amap.com/images/car.png',
            offset: new AMap.Pixel(-26, -13),
            autoRotation: false,  // 关闭自动旋转，改为手动控制车头方向
            angle: 0,  // 初始角度设为0
            zIndex: 100  // 设置层级，确保车辆图标在最上层
        });
        
        // 存储当前点索引，用于手动计算角度
        this.currentPointIndex = 0;
    },
    
    // 计算两点之间的角度（用于车头朝向）
    // 现在用于手动控制车头方向
    calculateAngle(point1, point2) {
        // 验证输入参数
        if (!point1 || !point2 || 
            typeof point1.lat !== 'number' || typeof point1.lng !== 'number' ||
            typeof point2.lat !== 'number' || typeof point2.lng !== 'number' ||
            isNaN(point1.lat) || isNaN(point1.lng) ||
            isNaN(point2.lat) || isNaN(point2.lng) ||
            !isFinite(point1.lat) || !isFinite(point1.lng) ||
            !isFinite(point2.lat) || !isFinite(point2.lng)) {
            console.warn('计算角度时坐标无效，返回默认角度0');
            return 0;
        }
        
        // 使用高德地图推荐的角度计算方法
        const deltaLng = point2.lng - point1.lng;
        const deltaLat = point2.lat - point1.lat;
        
        // 使用atan2计算角度，注意参数顺序
        let angle = Math.atan2(deltaLng, deltaLat) * 180 / Math.PI;
        
        // 验证计算结果
        if (isNaN(angle) || !isFinite(angle)) {
            console.warn('角度计算结果无效，返回默认角度0');
            return 0;
        }
        
        // 转换为0-360度范围
        if (angle < 0) {
            angle += 360;
        }
        
        // 车辆图标默认朝右，需要减去90度使其朝上
        angle = angle - 90;
        if (angle < 0) {
            angle += 360;
        }
        
        return angle;
    },
    
    // 创建已走过的轨迹线
    createPassedPolyline() {
        if (this.passedPolyline) {
            this.passedPolyline.setMap(null);
            this.passedPolyline = null;
        }
        
        // 不立即创建，等有有效路径数据时再创建
        // 避免空路径导致的Polyline错误
    },
    
    // 播放动画
    playAnimation() {
        try {
            // 验证并过滤有效的坐标点
            const validPath = this.trackPoints
                .filter(point => {
                    return point && 
                           typeof point.lng === 'number' && 
                           typeof point.lat === 'number' &&
                           !isNaN(point.lng) && 
                           !isNaN(point.lat) &&
                           isFinite(point.lng) &&
                           isFinite(point.lat) &&
                           point.lng >= -180 && point.lng <= 180 &&
                           point.lat >= -90 && point.lat <= 90;
                })
                .map(point => {
                    // 确保坐标精度合理，避免过高精度导致的问题
                    const lng = Math.round(point.lng * 1000000) / 1000000;
                    const lat = Math.round(point.lat * 1000000) / 1000000;
                    return [lng, lat];
                });
            
            if (validPath.length < 2) {
                MessageUtils.show('有效轨迹路径数据不足，无法播放动画', 'warning');
                return;
            }
            
            this.isAnimating = true;
            this.updateAnimationUI();
            
            // 清除之前的事件监听器
            if (this.animationMarker) {
                this.animationMarker.off('moving');
                this.animationMarker.off('moveend');
                this.animationMarker.off('movealong');
            }
            
            // 监听moveAlong动画过程中的事件
            this.animationMarker.on('moving', (e) => {
                try {
                    // 更新已走过的路径 - 使用moveAlong提供的passedPath
                    if (e.passedPath && e.passedPath.length > 0) {
                        if (!this.passedPolyline) {
                            this.passedPolyline = new AMap.Polyline({
                                map: MapCore.getMap(),
                                path: e.passedPath,
                                strokeColor: '#00FF00',
                                strokeWeight: 6,
                                strokeOpacity: 0.8,
                                strokeStyle: 'solid'
                            });
                        } else {
                            this.passedPolyline.setPath(e.passedPath);
                        }
                        
                        // 手动计算并设置车头角度
                        const passedPath = e.passedPath;
                        if (passedPath.length >= 2) {
                            const currentPoint = passedPath[passedPath.length - 1];
                            const previousPoint = passedPath[passedPath.length - 2];
                            
                            if (currentPoint && previousPoint) {
                                const angle = this.calculateAngle(
                                    {lng: previousPoint[0], lat: previousPoint[1]},
                                    {lng: currentPoint[0], lat: currentPoint[1]}
                                );
                                // 直接设置车头角度
                                this.animationMarker.setAngle(angle);
                            }
                        }
                    }
                    
                    // 车辆跟随功能：让地图中心跟随车辆位置
                    const currentPosition = this.animationMarker.getPosition();
                    if (currentPosition) {
                        const map = MapCore.getMap();
                        
                        // 平滑移动地图中心到车辆位置
                        map.panTo(currentPosition);
                        
                        // 设置合适的缩放级别（15-17级比较适合看清道路和前方路线）
                        const currentZoom = map.getZoom();
                        const targetZoom = 16; // 适中的缩放级别，既能看清道路又能了解周边环境
                        
                        if (Math.abs(currentZoom - targetZoom) > 1) {
                            map.setZoom(targetZoom);
                        }
                    }
                } catch (error) {
                    console.warn('更新已走过路径或车辆跟随失败：', error);
                }
            });
            
            // 监听动画结束事件
            this.animationMarker.on('movealong', () => {
                this.isAnimating = false;
                this.updateAnimationUI();
                MessageUtils.show('轨迹动画播放完成', 'success');
                console.log('轨迹动画播放完成');
            });
            
            // 设置初始地图视野：以起始点为中心，合适的缩放级别
            const map = MapCore.getMap();
            const startPosition = validPath[0];
            map.setCenter(startPosition);
            map.setZoom(16); // 设置合适的初始缩放级别
            
            // 使用moveAlong方法播放轨迹动画，精确控制播放时长
            // 注意：autoRotation已在Marker创建时设置，这里不再重复设置避免冲突
            this.animationMarker.moveAlong(validPath, {
                duration: this.totalAnimationDuration, // 总时长10秒，提高播放速度
                circlable: false     // 不循环播放
            });
            
            MessageUtils.show('轨迹动画开始播放，车辆将保持在视野中央', 'success');
            console.log(`轨迹动画开始，有效路径点数：${validPath.length}，总时长：${this.totalAnimationDuration}ms（${this.totalAnimationDuration/1000}秒），使用moveAlong方法，启用车辆跟随功能`);
        } catch (error) {
            this.isAnimating = false;
            this.updateAnimationUI();
            console.error('播放动画失败：', error);
            MessageUtils.show('播放动画失败：' + error.message, 'error');
        }
    },
    
    // 恢复轨迹动画（用于暂停后继续播放）
    resumeTrackAnimation() {
        if (!this.animationMarker) {
            MessageUtils.show('没有动画可恢复', 'warning');
            return;
        }
        
        try {
            this.animationMarker.resumeMove();
            this.isAnimating = true;
            this.updateAnimationUI();
            MessageUtils.show('轨迹动画已恢复', 'info');
        } catch (error) {
            MessageUtils.show('恢复动画失败', 'error');
            console.error('恢复动画失败：', error);
        }
    },
    
    // 暂停轨迹动画
    pauseTrackAnimation() {
        if (!this.isAnimating || !this.animationMarker) {
            MessageUtils.show('没有正在播放的动画', 'warning');
            return;
        }
        
        try {
            // 暂停moveAlong动画
            this.animationMarker.pauseMove();
            this.isAnimating = false;
            this.updateAnimationUI();
            MessageUtils.show('轨迹动画已暂停', 'info');
        } catch (error) {
            MessageUtils.show('暂停动画失败', 'error');
            console.error('暂停动画失败：', error);
        }
    },
    
    // 停止轨迹动画
    stopTrackAnimation() {
        if (!this.animationMarker) {
            MessageUtils.show('没有动画可停止', 'warning');
            return;
        }
        
        try {
            // 停止moveAlong动画
            this.animationMarker.stopMove();
            
            // 重置到起始位置
            if (this.trackPoints && this.trackPoints.length > 0) {
                const startPoint = this.trackPoints[0];
                this.animationMarker.setPosition([startPoint.lng, startPoint.lat]);
            }
            
            // 清除已走过的轨迹线
            if (this.passedPolyline) {
                this.passedPolyline.setMap(null);
                this.passedPolyline = null;
            }
            
            this.isAnimating = false;
            this.updateAnimationUI();
            MessageUtils.show('轨迹动画已停止', 'info');
        } catch (error) {
            MessageUtils.show('停止动画失败', 'error');
            console.error('停止动画失败：', error);
        }
    },
    
    // 在缩略图中添加轨迹
    addTrackToOverView(path) {
        if (!path || path.length < 2) {
            console.warn('轨迹路径数据不足');
            return;
        }
        
        // 清除之前的轨迹
        if (this.overViewPolyline) {
            this.overViewPolyline.setMap(null);
            this.overViewPolyline = null;
        }
        
        const addTrackToHawkEye = (hawkEye) => {
            // 延迟确保HawkEye完全初始化
            setTimeout(() => {
                try {
                    let overViewMap = null;
                    
                    // 尝试多种方式获取鹰眼地图实例
                    if (hawkEye && typeof hawkEye.getOverViewMap === 'function') {
                        overViewMap = hawkEye.getOverViewMap();
                    } else if (hawkEye && hawkEye._overViewMap) {
                        overViewMap = hawkEye._overViewMap;
                    } else if (hawkEye && hawkEye.overViewMap) {
                        overViewMap = hawkEye.overViewMap;
                    }
                    
                    if (overViewMap) {
                        // 在鹰眼地图上创建轨迹线
                        this.overViewPolyline = new AMap.Polyline({
                            path: path,
                            strokeColor: '#FF6B6B',
                            strokeWeight: 2,
                            strokeOpacity: 0.9,
                            strokeStyle: 'solid',
                            zIndex: 100
                        });
                        
                        // 添加到缩略图
                        if (overViewMap.add) {
                            overViewMap.add(this.overViewPolyline);
                        } else {
                            this.overViewPolyline.setMap(overViewMap);
                        }
                        
                        console.log('轨迹已成功添加到鹰眼控件，包含', path.length, '个点');
                    } else {
                        console.warn('无法获取鹰眼地图实例，使用备用方案');
                        this.addSimplifiedTrackToMainMap(path);
                    }
                } catch (innerError) {
                    console.warn('缩略图轨迹添加失败，使用备用方案：', innerError);
                    this.addSimplifiedTrackToMainMap(path);
                }
            }, 800);
        };
        
        try {
            // 检查HawkEye是否已经准备就绪
            const hawkEye = MapCore.getOverView();
            if (hawkEye) {
                addTrackToHawkEye(hawkEye);
            } else {
                // 监听HawkEye准备就绪事件
                const handleHawkEyeReady = (event) => {
                    addTrackToHawkEye(event.detail);
                    window.removeEventListener('hawkeyeReady', handleHawkEyeReady);
                };
                window.addEventListener('hawkeyeReady', handleHawkEyeReady);
                
                // 设置超时备用方案
                setTimeout(() => {
                    window.removeEventListener('hawkeyeReady', handleHawkEyeReady);
                    console.warn('HawkEye控件初始化超时，使用备用方案');
                    this.addSimplifiedTrackToMainMap(path);
                }, 3000);
            }
        } catch (error) {
            console.warn('添加轨迹到缩略图失败：', error);
            this.addSimplifiedTrackToMainMap(path);
        }
    },
    
    // 在主地图上添加简化的轨迹显示（备用方案）
    addSimplifiedTrackToMainMap(path) {
        try {
            if (this.simplifiedTrackPolyline) {
                this.simplifiedTrackPolyline.setMap(null);
                this.simplifiedTrackPolyline = null;
            }
            
            // 创建一个半透明的轨迹线作为全局视野参考
            this.simplifiedTrackPolyline = new AMap.Polyline({
                path: path,
                strokeColor: '#FFB6C1',
                strokeWeight: 2,
                strokeOpacity: 0.6,
                strokeStyle: 'dashed',
                zIndex: 50
            });
            
            this.simplifiedTrackPolyline.setMap(MapCore.getMap());
            console.log('已在主地图上添加简化轨迹显示');
        } catch (error) {
            console.warn('添加简化轨迹显示失败：', error);
        }
    },
    
    // 更新动画控制UI
    updateAnimationUI() {
        const playBtn = document.getElementById('play-track-btn');
        const pauseBtn = document.getElementById('pause-track-btn');
        const stopBtn = document.getElementById('stop-animation-btn');
        
        if (playBtn && pauseBtn && stopBtn) {
            if (this.isAnimating) {
                playBtn.disabled = true;
                pauseBtn.disabled = false;
                stopBtn.disabled = false;
                playBtn.textContent = '播放中...';
            } else {
                // 如果有暂停的动画，显示"继续播放"；否则显示"播放轨迹"
                if (this.animationMarker) {
                    playBtn.textContent = '继续播放';
                    playBtn.disabled = false;
                } else {
                    playBtn.textContent = '播放轨迹';
                    playBtn.disabled = this.trackPoints.length < 2;
                }
                pauseBtn.disabled = true;
                stopBtn.disabled = !this.animationMarker;
            }
        }
    }
};