// 路线规划功能模块
const RouteModule = {
    driving: null,
    walking: null,
    transit: null,
    riding: null,
    geocoder: null,
    currentTransportMode: 'driving',
    
    // 初始化路线规划功能
    init() {
        this.initRouteServices();
        this.bindEvents();
        this.initAddressSuggestion();
    },
    
    // 初始化路线规划服务
    initRouteServices() {
        const that = this;
        
        // 确保地图已经初始化
        if (!MapCore.getMap()) {
            console.error('地图未初始化，无法创建路线规划服务');
            setTimeout(() => {
                that.initRouteServices();
            }, 1000);
            return;
        }
        
        AMap.plugin(['AMap.Driving', 'AMap.Walking', 'AMap.Transfer', 'AMap.Riding', 'AMap.Geocoder'], function() {
            try {
                const map = MapCore.getMap();
                
                // 地理编码服务
                that.geocoder = new AMap.Geocoder({
                    radius: 1000,
                    extensions: 'all'
                });
                
                // 驾车路线规划
                that.driving = new AMap.Driving({
                    policy: AMap.DrivingPolicy.LEAST_TIME,
                    ferry: 0,
                    map: map,
                    panel: null,
                    hideMarkers: false,
                    showTraffic: false,
                    province: ''
                });
                
                // 步行路线规划
                that.walking = new AMap.Walking({
                    map: map,
                    panel: null,
                    hideMarkers: false
                });
                
                // 公交路线规划
                that.transit = new AMap.Transfer({
                    map: map,
                    policy: AMap.TransferPolicy.LEAST_TIME,
                    panel: null,
                    hideMarkers: false,
                    city: '石家庄'  // 默认城市，实际使用时会动态设置
                });
                
                // 骑行路线规划
                that.riding = new AMap.Riding({
                    map: map,
                    panel: null,
                    hideMarkers: false
                });
                
                console.log('路线规划服务初始化完成', {
                    driving: !!that.driving,
                    walking: !!that.walking,
                    transit: !!that.transit,
                    riding: !!that.riding,
                    geocoder: !!that.geocoder
                });
            } catch (error) {
                MessageUtils.show('路线规划服务初始化失败', 'error');
                console.error('路线规划服务初始化失败：', error);
            }
        });
    },
    
    // 绑定路线规划事件
    bindEvents() {
        const that = this;
        
        // 路线规划按钮点击事件
        document.getElementById('route-btn').addEventListener('click', function() {
            that.planRoute();
        });
        
        // 交通方式切换事件
        document.querySelectorAll('.transport-options button').forEach(button => {
            button.addEventListener('click', function() {
                // 移除所有按钮的active类
                document.querySelectorAll('.transport-options button').forEach(btn => {
                    btn.classList.remove('active');
                });
                // 为当前按钮添加active类
                this.classList.add('active');
                // 更新当前交通方式
                that.currentTransportMode = this.id.replace('-btn', '');
            });
        });
        
        // 起点终点输入框事件
        document.getElementById('start-point').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                that.planRoute();
            }
        });
        
        document.getElementById('end-point').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                that.planRoute();
            }
        });
        
        // 获取当前位置按钮事件
        const currentLocationBtn = document.getElementById('current-location-btn');
        if (currentLocationBtn) {
            currentLocationBtn.addEventListener('click', function() {
                that.setCurrentLocationAsStart();
            });
        }
        
        // 交换起终点按钮事件
        const swapBtn = document.getElementById('swap-btn');
        if (swapBtn) {
            swapBtn.addEventListener('click', function() {
                that.swapStartAndEnd();
            });
        }
        
        // 清除输入框的坐标缓存当用户手动输入时
        document.getElementById('start-point').addEventListener('input', function() {
            this.removeAttribute('data-coordinates');
        });
        
        document.getElementById('end-point').addEventListener('input', function() {
            this.removeAttribute('data-coordinates');
        });
    },
    
    // 规划路线
    planRoute() {
        const startPoint = document.getElementById('start-point').value.trim();
        const endPoint = document.getElementById('end-point').value.trim();
        
        if (!startPoint || !endPoint) {
            MessageUtils.show('请输入起点和终点', 'warning');
            return;
        }
        
        if (startPoint === endPoint) {
            MessageUtils.show('起点和终点不能相同', 'warning');
            return;
        }
        
        if (!this.geocoder) {
            MessageUtils.show('地理编码服务未初始化', 'error');
            return;
        }
        
        LoadingUtils.show('正在解析地址...');
        
        // 清除之前的路线
        this.clearRoute();
        
        // 先将地址转换为坐标，再进行路线规划
        this.convertAddressesToCoordinates(startPoint, endPoint, (error, startCoord, endCoord) => {
            if (error) {
                LoadingUtils.hide();
                MessageUtils.show(error, 'error');
                return;
            }
            
            // 执行路线搜索
            this.executeRouteSearch(startCoord, endCoord);
        });
    },
    
    // 地理编码：将地址转换为坐标
    convertAddressesToCoordinates(startAddress, endAddress, callback) {
        const results = {};
        let completed = 0;
        const total = 2;
        
        const checkComplete = () => {
            completed++;
            if (completed === total) {
                if (results.start && results.end) {
                    callback(null, results.start, results.end);
                } else {
                    const errorMsg = '地址解析失败，请检查输入的地址是否正确';
                    console.error(errorMsg, { start: results.start, end: results.end });
                    callback(errorMsg);
                }
            }
        };
        
        // 处理起点
        this.processAddressToCoordinate(startAddress, 'start', (error, coordinate) => {
            if (!error && coordinate) {
                results.start = coordinate;
            } else {
                console.error('起点地址解析失败:', error, startAddress);
            }
            checkComplete();
        });
        
        // 处理终点
        this.processAddressToCoordinate(endAddress, 'end', (error, coordinate) => {
            if (!error && coordinate) {
                results.end = coordinate;
            } else {
                console.error('终点地址解析失败:', error, endAddress);
            }
            checkComplete();
        });
    },
    
    // 处理单个地址转坐标
    processAddressToCoordinate(address, type, callback) {
        const that = this;
        
        // 首先检查输入框是否有缓存的坐标数据（来自自动完成）
        const inputId = type === 'start' ? 'start-point' : 'end-point';
        const inputElement = document.getElementById(inputId);
        if (inputElement && inputElement.dataset.coordinates) {
            const coordsStr = inputElement.dataset.coordinates.trim();
            if (coordsStr) {
                // 先检查是否为逗号分隔格式（旧格式）
                if (coordsStr.includes(',') && !coordsStr.includes('{')) {
                    try {
                        const coords = coordsStr.split(',');
                        if (coords.length === 2) {
                            const lng = parseFloat(coords[0].trim());
                            const lat = parseFloat(coords[1].trim());
                            if (!isNaN(lng) && !isNaN(lat)) {
                                const lngLat = new AMap.LngLat(lng, lat);
                                callback(null, lngLat);
                                return;
                            }
                        }
                    } catch (e) {
                        console.warn('解析逗号分隔坐标失败:', e);
                    }
                } else {
                    // 尝试JSON格式
                    try {
                        const coords = JSON.parse(coordsStr);
                        if (coords && typeof coords.lng === 'number' && typeof coords.lat === 'number') {
                            // 创建AMap.LngLat对象
                            const lngLat = new AMap.LngLat(coords.lng, coords.lat);
                            callback(null, lngLat);
                            return;
                        }
                    } catch (e) {
                        console.warn('解析JSON格式坐标失败:', e, '原始数据:', coordsStr);
                    }
                }
            }
            // 如果解析失败，清除无效的缓存数据
            console.warn('坐标缓存数据格式不正确，已清除:', coordsStr);
            inputElement.removeAttribute('data-coordinates');
        }
        
        // 检查是否为坐标格式（经度,纬度）
        const validCoord = this.validateCoordinates(address);
        if (validCoord) {
            const lngLat = new AMap.LngLat(validCoord[0], validCoord[1]);
            callback(null, lngLat);
            return;
        }
        
        console.log('开始地理编码:', address);
        
        // 使用地理编码服务解析地址
        this.geocoder.getLocation(address, function(status, result) {
            console.log('地理编码结果:', status, result);
            
            if (status === 'complete' && result.geocodes.length > 0) {
                const location = result.geocodes[0].location;
                console.log('地理编码成功:', address, '->', location);
                // 直接使用location对象，它已经是AMap.LngLat类型
                callback(null, location);
            } else {
                const errorMsg = '地理编码失败: ' + address + ' (状态: ' + status + ')';
                console.error(errorMsg, result);
                callback(errorMsg);
            }
        });
    },
    
    // 执行路线搜索
    executeRouteSearch(startCoord, endCoord) {
        const mode = this.getCurrentMode();
        
        console.log('执行路线搜索:', {
            mode: mode,
            start: startCoord,
            end: endCoord
        });
        
        // 确保坐标格式正确
        let start, end;
        
        if (startCoord instanceof AMap.LngLat) {
            start = startCoord;
        } else if (Array.isArray(startCoord)) {
            start = new AMap.LngLat(startCoord[0], startCoord[1]);
        } else {
            LoadingUtils.hide();
            MessageUtils.show('起点坐标格式错误', 'error');
            return;
        }
        
        if (endCoord instanceof AMap.LngLat) {
            end = endCoord;
        } else if (Array.isArray(endCoord)) {
            end = new AMap.LngLat(endCoord[0], endCoord[1]);
        } else {
            LoadingUtils.hide();
            MessageUtils.show('终点坐标格式错误', 'error');
            return;
        }
        
        switch(mode) {
            case 'driving':
                this.searchDriving(start, end);
                break;
            case 'walking':
                this.searchWalking(start, end);
                break;
            case 'transit':
                this.searchTransit(start, end);
                break;
            case 'riding':
                this.searchRiding(start, end);
                break;
            default:
                LoadingUtils.hide();
                MessageUtils.show('未知的出行方式', 'error');
        }
    },
    
    // 驾车路线规划
    searchDriving(start, end) {
        if (!this.driving) {
            LoadingUtils.hide();
            MessageUtils.show('驾车路线规划服务未初始化', 'error');
            return;
        }
        
        console.log('开始驾车路线搜索:', start, end);
        
        this.driving.search(start, end, (status, result) => {
            console.log('驾车路线搜索结果:', status, result);
            LoadingUtils.hide();
            
            if (status === 'complete' && result.routes && result.routes.length > 0) {
                this.processRouteResult(result, 'driving');
            } else {
                const errorMsg = '驾车路线规划失败 (状态: ' + status + ')';
                MessageUtils.show(errorMsg, 'error');
                console.error(errorMsg, result);
            }
        });
    },
    
    // 步行路线规划
    searchWalking(start, end) {
        if (!this.walking) {
            LoadingUtils.hide();
            MessageUtils.show('步行路线规划服务未初始化', 'error');
            return;
        }
        
        console.log('开始步行路线搜索:', start, end);
        
        this.walking.search(start, end, (status, result) => {
            console.log('步行路线搜索结果:', status, result);
            LoadingUtils.hide();
            
            if (status === 'complete' && result.routes && result.routes.length > 0) {
                this.processRouteResult(result, 'walking');
            } else {
                const errorMsg = '步行路线规划失败 (状态: ' + status + ')';
                MessageUtils.show(errorMsg, 'error');
                console.error(errorMsg, result);
            }
        });
    },
    
    // 公交路线规划
    searchTransit(start, end) {
        if (!this.transit) {
            LoadingUtils.hide();
            MessageUtils.show('公交路线规划服务未初始化', 'error');
            return;
        }
        
        console.log('开始公交路线搜索:', start, end);
        
        // 动态获取城市信息并设置
        this.getCityFromCoordinates(start, end, (city) => {
            if (city) {
                // 重新创建Transit对象以设置正确的城市
                this.transit = new AMap.Transfer({
                    map: MapCore.getMap(),
                    policy: AMap.TransferPolicy.LEAST_TIME,
                    panel: null,
                    hideMarkers: false,
                    city: city
                });
                console.log('设置公交路线规划城市为:', city);
            }
            
            this.transit.search(start, end, (status, result) => {
                console.log('公交路线搜索结果:', status, result);
                LoadingUtils.hide();
                
                if (status === 'complete' && result.plans && result.plans.length > 0) {
                    this.processTransitResult(result);
                } else {
                    const errorMsg = this.getTransitErrorMessage(status, result, start, end);
                    MessageUtils.show(errorMsg, 'error');
                    console.error(errorMsg, result);
                }
            });
        });
    },
    
    // 根据坐标获取城市信息
    getCityFromCoordinates(start, end, callback) {
        const that = this;
        let startCity = null;
        let endCity = null;
        let completed = 0;
        
        const checkComplete = () => {
            completed++;
            if (completed === 2) {
                // 两个坐标都处理完成
                if (startCity && endCity) {
                    if (startCity === endCity) {
                        // 同城市
                        callback(startCity);
                    } else {
                        // 跨城市，使用起点城市
                        console.warn('检测到跨城市路线规划:', startCity, '->', endCity, '，使用起点城市');
                        callback(startCity);
                    }
                } else {
                    // 无法确定城市，使用默认值
                    console.warn('无法确定城市信息，使用默认城市: 石家庄');
                    callback('石家庄');
                }
            }
        };
        
        // 逆地理编码获取起点城市
        this.geocoder.getAddress(start, (status, result) => {
            if (status === 'complete' && result.regeocode) {
                startCity = result.regeocode.addressComponent.city || 
                           result.regeocode.addressComponent.province;
                console.log('起点城市:', startCity);
            } else {
                console.warn('获取起点城市失败:', status, result);
            }
            checkComplete();
        });
        
        // 逆地理编码获取终点城市
        this.geocoder.getAddress(end, (status, result) => {
            if (status === 'complete' && result.regeocode) {
                endCity = result.regeocode.addressComponent.city || 
                         result.regeocode.addressComponent.province;
                console.log('终点城市:', endCity);
            } else {
                console.warn('获取终点城市失败:', status, result);
            }
            checkComplete();
        });
    },
    
    // 获取公交路线规划错误消息
    getTransitErrorMessage(status, result, start, end) {
        let errorMsg = '公交路线规划失败';
        
        switch (status) {
            case 'error':
                if (result && result.info) {
                    switch (result.info) {
                        case 'NO_CITY':
                            errorMsg = '无法确定城市信息，请检查起点和终点是否在同一城市内，或地址是否正确';
                            break;
                        case 'NO_ROADS_NEARBY':
                            errorMsg = '附近没有可用的公交线路，请尝试选择其他地点';
                            break;
                        case 'NO_SOLUTION':
                            errorMsg = '未找到合适的公交路线，建议尝试其他交通方式';
                            break;
                        case 'OVER_DIRECTION_RANGE':
                            errorMsg = '路线规划距离超出限制，请选择较近的目的地';
                            break;
                        default:
                            errorMsg = `公交路线规划失败: ${result.info}`;
                    }
                } else {
                    errorMsg = '公交路线规划出现未知错误';
                }
                break;
            case 'no_data':
                errorMsg = '该区域暂无公交数据，请尝试其他交通方式';
                break;
            default:
                errorMsg = `公交路线规划失败 (状态: ${status})`;
        }
        
        return errorMsg;
    },
    
    // 骑行路线规划
    searchRiding(start, end) {
        if (!this.riding) {
            LoadingUtils.hide();
            MessageUtils.show('骑行路线规划服务未初始化', 'error');
            return;
        }
        
        console.log('开始骑行路线搜索:', start, end);
        
        this.riding.search(start, end, (status, result) => {
            console.log('骑行路线搜索结果:', status, result);
            LoadingUtils.hide();
            
            if (status === 'complete' && result.routes && result.routes.length > 0) {
                this.processRouteResult(result, 'riding');
            } else {
                const errorMsg = '骑行路线规划失败 (状态: ' + status + ')';
                MessageUtils.show(errorMsg, 'error');
                console.error(errorMsg, result);
            }
        });
    },
    
    // 处理路线规划结果
    processRouteResult(result, transportType) {
        if (!result.routes || result.routes.length === 0) {
            MessageUtils.show('未找到合适的路线', 'info');
            return;
        }
        
        const route = result.routes[0];
        const distance = (route.distance / 1000).toFixed(2);
        const duration = this.formatDuration(route.time);
        
        // 显示路线信息
        this.displayRouteInfo(route, transportType, distance, duration);
        
        MessageUtils.show(`${transportType}路线规划完成`, 'success');
    },
    
    // 处理公交路线规划结果
    processTransitResult(result) {
        if (!result.plans || result.plans.length === 0) {
            MessageUtils.show('未找到合适的公交路线', 'info');
            return;
        }
        
        const plan = result.plans[0];
        const distance = (plan.distance / 1000).toFixed(2);
        const duration = this.formatDuration(plan.time);
        
        // 显示公交路线信息
        this.displayTransitInfo(plan, distance, duration);
        
        MessageUtils.show('公交路线规划完成', 'success');
    },
    
    // 显示路线信息
    displayRouteInfo(route, transportType, distance, duration) {
        let content = `
            <div class="route-info">
                <div class="distance">距离：${distance} 公里</div>
                <div class="duration">预计时间：${duration}</div>
                <div class="transport-type">交通方式：${transportType}</div>
            </div>
        `;
        
        if (route.steps && route.steps.length > 0) {
            content += '<div class="route-steps">';
            route.steps.forEach((step, index) => {
                const stepDistance = (step.distance / 1000).toFixed(2);
                content += `
                    <div class="route-step">
                        <div class="instruction">${step.instruction}</div>
                        ${step.road ? `<div class="road-name">经过：${step.road}</div>` : ''}
                        <div class="distance">距离：${stepDistance} 公里</div>
                    </div>
                `;
            });
            content += '</div>';
        }
        
        InfoPanel.show(content, `${transportType}路线`);
    },
    
    // 显示公交路线信息
    displayTransitInfo(plan, distance, duration) {
        let content = `
            <div class="route-info">
                <div class="distance">距离：${distance} 公里</div>
                <div class="duration">预计时间：${duration}</div>
                <div class="transport-type">交通方式：公交</div>
            </div>
        `;
        
        if (plan.segments && plan.segments.length > 0) {
            content += '<div class="route-steps">';
            plan.segments.forEach((segment, index) => {
                if (segment.transit_mode === 'WALK') {
                    content += `
                        <div class="route-step">
                            <div class="instruction">步行 ${(segment.distance / 1000).toFixed(2)} 公里</div>
                            <div class="duration">约 ${Math.ceil(segment.time / 60)} 分钟</div>
                        </div>
                    `;
                } else if (segment.transit) {
                    const transit = segment.transit;
                    const lineName = transit.lines && transit.lines.length > 0 ? transit.lines[0].name : '未知线路';
                    const onName = transit.on ? transit.on.name : '起点';
                    const offName = transit.off ? transit.off.name : '终点';
                    const stationCount = transit.segments ? transit.segments.length : 0;
                    content += `
                        <div class="route-step">
                            <div class="instruction">乘坐 ${lineName}</div>
                            <div class="road-name">从 ${onName} 到 ${offName}</div>
                            <div class="distance">${stationCount} 站</div>
                        </div>
                    `;
                }
            });
            content += '</div>';
        }
        
        InfoPanel.show(content, '公交路线');
    },
    
    // 清除路线
    clearRoute() {
        if (this.driving) this.driving.clear();
        if (this.walking) this.walking.clear();
        if (this.transit) this.transit.clear();
        if (this.riding) this.riding.clear();
        
        InfoPanel.hide();
    },
    
    // 格式化时间（秒转为小时和分钟）
    formatDuration(seconds) {
        if (seconds < 60) {
            return "不到1分钟";
        }
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        let result = '';
        if (hours > 0) {
            result += `${hours} 小时`;
        }
        if (minutes > 0) {
            if (result !== '') result += ' ';
            result += `${minutes} 分钟`;
        }
        
        return result || "未知时间";
    },
    
    // 设置起点
    setStartPoint(address) {
        document.getElementById('start-point').value = address;
    },
    
    // 设置终点
    setEndPoint(address) {
        document.getElementById('end-point').value = address;
    },
    
    // 获取当前交通方式
    getCurrentMode() {
        return this.currentTransportMode;
    },
    
    // 设置交通方式
    setTransportMode(mode) {
        this.currentTransportMode = mode;
        
        // 更新UI
        document.querySelectorAll('.transport-options button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const targetBtn = document.getElementById(mode + '-btn');
        if (targetBtn) {
            targetBtn.classList.add('active');
        }
    },
    
    // 获取当前位置并设置为起点
    setCurrentLocationAsStart() {
        const that = this;
        const btn = document.getElementById('current-location-btn');
        const startInput = document.getElementById('start-point');
        
        // 禁用按钮并显示加载状态
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '📍';
            btn.style.opacity = '0.6';
        }
        
        LoadingUtils.show('正在获取当前位置...');
        
        // 使用高德地图的定位服务
        AMap.plugin('AMap.Geolocation', function() {
            const geolocation = new AMap.Geolocation({
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            });
            
            geolocation.getCurrentPosition(function(status, result) {
                LoadingUtils.hide();
                if (btn) {
                    btn.disabled = false;
                    btn.style.opacity = '1';
                }
                
                if (status === 'complete') {
                    const position = result.position;
                    const lng = position.lng;
                    const lat = position.lat;
                    
                    // 设置坐标缓存
                    startInput.dataset.coordinates = JSON.stringify({lng: lng, lat: lat});
                    
                    // 进行逆地理编码获取地址名称
                    that.geocoder.getAddress([lng, lat], function(status, result) {
                        if (status === 'complete' && result.regeocode) {
                            startInput.value = result.regeocode.formattedAddress || '当前位置';
                        } else {
                            startInput.value = `${lng.toFixed(6)},${lat.toFixed(6)}`;
                        }
                    });
                    
                    MessageUtils.show('已获取当前位置', 'success');
                } else {
                    MessageUtils.show('获取位置失败: ' + (result.message || '未知错误'), 'error');
                }
            });
        });
    },
    
    // 交换起点和终点
    swapStartAndEnd() {
        const startInput = document.getElementById('start-point');
        const endInput = document.getElementById('end-point');
        
        // 交换输入框的值
        const tempValue = startInput.value;
        startInput.value = endInput.value;
        endInput.value = tempValue;
        
        // 交换坐标缓存
        const tempCoords = startInput.dataset.coordinates;
        if (endInput.dataset.coordinates) {
            startInput.dataset.coordinates = endInput.dataset.coordinates;
        } else {
            startInput.removeAttribute('data-coordinates');
        }
        
        if (tempCoords) {
            endInput.dataset.coordinates = tempCoords;
        } else {
            endInput.removeAttribute('data-coordinates');
        }
        
        MessageUtils.show('已交换起终点', 'success');
    },
    
    // 验证坐标格式
    validateCoordinates(coordStr) {
        const coordPattern = /^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/;
        const match = coordStr.match(coordPattern);
        if (match) {
            const lng = parseFloat(match[1]);
            const lat = parseFloat(match[2]);
            // 检查经纬度范围
            if (lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) {
                return [lng, lat];
            }
        }
        return null;
    },
    
    // 添加地址输入建议功能
    initAddressSuggestion() {
        const that = this;
        const startInput = document.getElementById('start-point');
        const endInput = document.getElementById('end-point');
        
        if (startInput && endInput) {
            // 为起点输入框添加自动完成
            AMap.plugin('AMap.AutoComplete', function() {
                const autoComplete = new AMap.AutoComplete({
                    input: 'start-point'
                });
                
                autoComplete.on('select', function(e) {
                    if (e.poi && e.poi.location) {
                        const location = e.poi.location;
                        startInput.value = e.poi.name;
                        startInput.dataset.coordinates = location.lng + ',' + location.lat;
                    }
                });
            });
            
            // 为终点输入框添加自动完成
            AMap.plugin('AMap.AutoComplete', function() {
                const autoComplete = new AMap.AutoComplete({
                    input: 'end-point'
                });
                
                autoComplete.on('select', function(e) {
                    if (e.poi && e.poi.location) {
                        const location = e.poi.location;
                        endInput.value = e.poi.name;
                        endInput.dataset.coordinates = location.lng + ',' + location.lat;
                    }
                });
            });
        }
    }
};