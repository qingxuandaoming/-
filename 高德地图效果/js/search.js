// 搜索功能模块
const SearchModule = {
    placeSearch: null,
    
    // 初始化搜索功能
    init() {
        this.initSearchService();
        this.bindEvents();
    },
    
    // 初始化搜索服务
    initSearchService() {
        const that = this;
        AMap.plugin(['AMap.PlaceSearch'], function() {
            try {
                that.placeSearch = new AMap.PlaceSearch({
                    pageSize: 10,
                    pageIndex: 1,
                    city: '全国',
                    citylimit: false,
                    autoFitView: true
                });
                console.log('搜索服务初始化完成');
            } catch (error) {
                MessageUtils.show('搜索服务初始化失败', 'error');
                console.error('搜索服务初始化失败：', error);
            }
        });
    },
    
    // 绑定搜索事件
    bindEvents() {
        const that = this;
        
        // 搜索按钮点击事件
        document.getElementById('search-btn').addEventListener('click', function() {
            that.performSearch();
        });
        
        // 搜索框回车事件
        document.getElementById('keyword').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                that.performSearch();
            }
        });
        
        // 搜索框实时搜索（防抖）
        document.getElementById('keyword').addEventListener('input', Utils.debounce(function() {
            const keyword = this.value ? this.value.trim() : '';
            if (keyword.length >= 2) {
                that.performSearch();
            }
        }, 500));
    },
    
    // 执行搜索
    performSearch() {
        const keyword = document.getElementById('keyword').value.trim();
        if (!keyword) {
            MessageUtils.show('请输入搜索关键词', 'warning');
            return;
        }
        
        LoadingUtils.show('正在搜索...');
        MapCore.clearMarkers('poi');
        
        const searchType = document.querySelector('input[name="search-type"]:checked').value;
        const that = this;
        
        if (searchType === 'poi') {
            this.searchPOI(keyword);
        } else if (searchType === 'around') {
            this.searchAround(keyword);
        }
    },
    
    // POI搜索
    searchPOI(keyword) {
        const that = this;
        this.placeSearch.search(keyword, function(status, result) {
            LoadingUtils.hide();
            if (status === 'complete' && result.info === 'OK') {
                const pois = result.poiList.pois;
                that.processPOISearchResult(pois);
            } else {
                MessageUtils.show('搜索失败：' + result.info, 'error');
            }
        });
    },
    
    // 周边搜索
    searchAround(keyword) {
        const center = MapCore.getMap().getCenter();
        const that = this;
        this.placeSearch.searchNearBy(keyword, center, 5000, function(status, result) {
            LoadingUtils.hide();
            if (status === 'complete' && result.info === 'OK') {
                const pois = result.poiList.pois;
                that.processPOISearchResult(pois);
            } else {
                MessageUtils.show('周边搜索失败：' + result.info, 'error');
            }
        });
    },
    
    // 处理POI搜索结果
    processPOISearchResult(pois) {
        if (!pois || pois.length === 0) {
            MessageUtils.show('未找到相关结果', 'info');
            return;
        }
        
        // 在地图上添加标记
        pois.forEach((poi, index) => {
            MapCore.addMarker(poi.location, poi.name, poi, 'poi');
        });
        
        // 显示搜索结果列表
        this.displaySearchResults(pois);
        
        // 调整地图视野
        const markers = MapCore.markers.filter(marker => marker.markerType === 'poi');
        if (markers.length > 0) {
            MapCore.setFitView(markers);
        }
        
        MessageUtils.show(`找到 ${pois.length} 个相关结果`, 'success');
    },
    
    // 显示搜索结果列表
    displaySearchResults(pois) {
        let content = '<div class="search-results">';
        
        pois.forEach((poi, index) => {
            content += `
                <div class="search-result-item" data-index="${index}">
                    <div class="search-result-title">${poi.name}</div>
                    ${poi.address ? `<div class="search-result-address">${poi.address}</div>` : ''}
                    ${poi.type ? `<div class="search-result-type">${poi.type}</div>` : ''}
                </div>
            `;
        });
        
        content += '</div>';
        
        InfoPanel.show(content, '搜索结果');
        
        // 绑定结果项点击事件
        this.bindResultItemEvents(pois);
    },
    
    // 绑定搜索结果项点击事件
    bindResultItemEvents(pois) {
        const resultItems = document.querySelectorAll('.search-result-item');
        resultItems.forEach((item, index) => {
            item.addEventListener('click', function() {
                const poi = pois[index];
                MapCore.setCenter(poi.location);
                MapCore.setZoom(16);
                MapCore.showInfoWindow(poi);
                
                // 高亮选中的结果项
                resultItems.forEach(i => i.classList.remove('selected'));
                this.classList.add('selected');
            });
        });
    },
    
    // 清除搜索结果
    clearResults() {
        MapCore.clearMarkers('poi');
        InfoPanel.hide();
        document.getElementById('keyword').value = '';
    },
    
    // 获取当前搜索关键词
    getCurrentKeyword() {
        return document.getElementById('keyword').value.trim();
    },
    
    // 设置搜索关键词
    setKeyword(keyword) {
        document.getElementById('keyword').value = keyword;
    }
};