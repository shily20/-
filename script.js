class ProjectManager {
    constructor() {
        this.projects = JSON.parse(localStorage.getItem('projects')) || {};
        this.currentProjectId = localStorage.getItem('currentProjectId') || 'default';
        this.projectLabel = localStorage.getItem('projectLabel') || 'name';
        this.chart = null;
        this.init();
    }

    init() {
        if (!this.projects[this.currentProjectId]) {
            this.createProject(this.currentProjectId, '我的项目');
        }
        this.render();
        this.bindEvents();
        this.setupNotifications();
    }

    createProject(id, name) {
        const presetMilestones = [
            { name: '提案', note: '123', completed: false },
            { name: '目录大纲', note: '123', completed: false },
            { name: '文本样章', note: '风格与深度校准', completed: false },
            { name: '版式文本', note: '目录篇章节核心板块小结节', completed: false },
            { name: '三分之一稿件', note: '123', completed: false },
            { name: '排版', note: '123', completed: false },
            { name: '全文定稿', note: '123', completed: false },
            { name: '插画', note: '根据内容提炼插画关键词做好文本索引', completed: false },
            { name: '全文排版', note: '补全插画', completed: false },
            { name: '封面文案', note: '123', completed: false },
            { name: '封面设计', note: '123', completed: false },
            { name: '出片交付', note: '出片检查，源文件存档', completed: false }
        ];

        this.projects[id] = {
            name: name,
            milestones: presetMilestones,
            shareId: this.generateShareId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.save();
    }

    switchProject(projectId) {
        this.currentProjectId = projectId;
        localStorage.setItem('currentProjectId', projectId);
        this.render();
        this.updateChart();
    }

    save() {
        if (this.projects[this.currentProjectId]) {
            this.projects[this.currentProjectId].updatedAt = new Date().toISOString();
        }
        localStorage.setItem('projects', JSON.stringify(this.projects));
    }

    getCurrentProject() {
        return this.projects[this.currentProjectId];
    }

    updateProjectName(name) {
        this.getCurrentProject().name = name;
        this.save();
    }

    addMilestone(note) {
        if (!note || note.trim() === '') {
            alert('请输入节点备注');
            return;
        }
        // 自动生成节点名称
        const name = `节点 ${this.getCurrentProject().milestones.length + 1}`;
        this.getCurrentProject().milestones.push({ name: name, note: note.trim(), completed: false });
        this.save();
        this.render();
        this.showNotification('节点添加成功！');
    }

    deleteMilestone(index) {
        if (confirm('确定要删除这个节点吗？')) {
            this.getCurrentProject().milestones.splice(index, 1);
            this.save();
            this.render();
            this.updateChart();
            this.showNotification('节点删除成功');
        }
    }

    toggleMilestone(index) {
        const milestone = this.getCurrentProject().milestones[index];
        const wasCompleted = milestone.completed;
        milestone.completed = !wasCompleted;
        
        if (milestone.completed) {
            milestone.completedAt = new Date().toISOString();
            this.showNotification(`🎉 "${milestone.name}" 完成！`);
            
            // 检查是否全部完成
            if (this.getProgress() === 100) {
                setTimeout(() => {
                    this.showCompletionCelebration();
                }, 500);
            }
        } else {
            milestone.completedAt = null;
        }
        
        this.save();
        this.render();
        this.updateChart();
    }

    updateMilestone(index, name, note) {
        this.getCurrentProject().milestones[index].name = name;
        this.getCurrentProject().milestones[index].note = note;
        this.save();
        this.render();
    }

    getProgress() {
        const project = this.getCurrentProject();
        if (project.milestones.length === 0) return 0;
        const completed = project.milestones.filter(m => m.completed).length;
        return (completed / project.milestones.length) * 100;
    }

    exportReport() {
        const project = this.getCurrentProject();
        const progress = this.getProgress();
        let report = `项目进度报告\n`;
        report += `================\n`;
        report += `项目名称: ${project.name}\n`;
        report += `完成进度: ${progress.toFixed(1)}%\n`;
        report += `生成时间: ${new Date().toLocaleString('zh-CN')}\n`;
        report += `================\n\n`;
        report += `节点完成情况:\n`;
        
        project.milestones.forEach((milestone, index) => {
            const status = milestone.completed ? '✅ 已完成' : '❌ 未完成';
            const completedInfo = milestone.completed && milestone.completedAt ? 
                ` (完成于: ${new Date(milestone.completedAt).toLocaleString('zh-CN')})` : '';
            report += `${index + 1}. ${milestone.name} ${status}${completedInfo}\n`;
            if (milestone.note) {
                report += `   备注: ${milestone.note}\n`;
            }
            report += `\n`;
        });

        const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.name}_进度报告_${new Date().toISOString().split('T')[0]}.txt`;
        
        // 移动端兼容
        if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|webOS|BlackBerry|IEMobile|Opera Mini)/i)) {
            // 在移动端，直接打开下载链接
            window.location.href = url;
        } else {
            a.click();
        }
        
        URL.revokeObjectURL(url);
        this.showNotification('报告导出成功！');
    }

    generateShareId() {
        return Math.random().toString(36).substring(2, 10);
    }

    getShareLink() {
        const project = this.getCurrentProject();
        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}?share=${project.shareId}`;
    }

    shareProject() {
        const modal = document.getElementById('share-modal');
        const shareLink = document.getElementById('share-link');
        
        // 设置分享链接
        shareLink.value = this.getShareLink();
        
        // 显示模态框
        modal.classList.remove('hidden');
    }

    copyShareLink() {
        const shareLink = document.getElementById('share-link');
        shareLink.select();
        
        try {
            document.execCommand('copy');
            this.showNotification('链接已复制到剪贴板！');
            
            const btn = document.getElementById('copy-link-btn');
            const originalText = btn.textContent;
            btn.textContent = '已复制';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        } catch (err) {
            // 移动端复制失败时的备用方案
            if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|webOS|BlackBerry|IEMobile|Opera Mini)/i)) {
                // 在移动端，提示用户手动复制
                alert('请长按链接并选择"复制"');
            }
        }
    }

    wechatShare() {
        if (navigator.userAgent.match(/MicroMessenger/i)) {
            // 如果在微信内，提示用户使用微信的分享功能
            alert('请点击右上角"..."，选择"分享到朋友圈"或"发送给朋友"');
        } else {
            alert('请将链接复制后，在微信中粘贴分享给好友');
        }
    }

    moreShare() {
        if (navigator.share) {
            // 使用Web Share API
            navigator.share({
                title: this.getCurrentProject().name,
                text: `查看我的项目进度：${this.getProgress().toFixed(1)}%`,
                url: this.getShareLink()
            }).catch(err => {
                console.log('分享失败:', err);
            });
        } else {
            alert('请复制链接后手动分享');
        }
    }

    joinSharedProject(shareId) {
        const projectId = Object.keys(this.projects).find(id => this.projects[id].shareId === shareId);
        
        if (projectId) {
            this.switchProject(projectId);
            this.showNotification(`成功加入项目: ${this.getCurrentProject().name}`);
        } else {
            this.showNotification('未找到共享项目');
        }
    }

    showStats() {
        const modal = document.getElementById('stats-modal');
        this.updateStats();
        this.updateChart();
        modal.classList.remove('hidden');
    }

    updateStats() {
        const project = this.getCurrentProject();
        const total = project.milestones.length;
        const completed = project.milestones.filter(m => m.completed).length;
        const pending = total - completed;
        const rate = this.getProgress();
        
        document.getElementById('total-milestones').textContent = total;
        document.getElementById('completed-milestones').textContent = completed;
        document.getElementById('pending-milestones').textContent = pending;
        document.getElementById('completion-rate').textContent = rate.toFixed(1) + '%';
    }

    updateChart() {
        const ctx = document.getElementById('progress-chart');
        if (!ctx) return;

        const project = this.getCurrentProject();
        const completed = project.milestones.filter(m => m.completed).length;
        const pending = project.milestones.length - completed;

        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['已完成', '待完成'],
                datasets: [{
                    data: [completed, pending],
                    backgroundColor: [
                        '#FF8C00',
                        '#E0E0E0'
                    ],
                    borderColor: [
                        '#FF8C00',
                        '#E0E0E0'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                size: 12
                            },
                            padding: 20
                        }
                    }
                },
                cutout: '70%'
            }
        });
    }

    showSettings() {
        const modal = document.getElementById('settings-modal');
        modal.classList.remove('hidden');
    }

    clearData() {
        if (confirm('确定要清除所有数据吗？此操作不可恢复！')) {
            localStorage.clear();
            this.projects = {};
            this.currentProjectId = 'default';
            this.createProject(this.currentProjectId, '我的项目');
            this.render();
            this.showNotification('数据已清除');
            this.closeAllModals();
        }
    }

    showCompletionCelebration() {
        // 创建庆祝动画
        const celebration = document.createElement('div');
        celebration.className = 'celebration';
        celebration.innerHTML = `
            <div class="celebration-content">
                <div class="celebration-emoji">🎉</div>
                <div class="celebration-text">恭喜！</div>
                <div class="celebration-subtext">所有节点已完成</div>
            </div>
        `;
        
        document.body.appendChild(celebration);
        
        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .celebration {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(10px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                animation: fadeIn 0.5s ease-out;
            }
            .celebration-content {
                text-align: center;
                color: white;
            }
            .celebration-emoji {
                font-size: 60px;
                margin-bottom: 20px;
                animation: bounce 1s ease-in-out infinite;
            }
            .celebration-text {
                font-size: 32px;
                font-weight: bold;
                margin-bottom: 10px;
            }
            .celebration-subtext {
                font-size: 18px;
                opacity: 0.9;
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes bounce {
                0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-20px); }
                60% { transform: translateY(-10px); }
            }
        `;
        document.head.appendChild(style);
        
        // 3秒后自动关闭
        setTimeout(() => {
            celebration.remove();
            style.remove();
        }, 3000);
    }

    showNotification(message) {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                font-size: 14px;
                z-index: 10000;
                animation: slideIn 0.3s ease-out, slideOut 0.3s ease-in 2.7s forwards;
                backdrop-filter: blur(10px);
                max-width: 80%;
                word-wrap: break-word;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        
        // 3秒后自动移除
        setTimeout(() => {
            notification.remove();
            if (document.head.contains(style)) {
                style.remove();
            }
        }, 3000);
    }

    setupNotifications() {
        // 检查是否支持通知
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    render() {
        this.renderProjectSelector();
        this.renderProjectTitle();
        this.renderMilestones();
        this.renderProgressWheel();
        this.updateTime();
    }

    renderProjectSelector() {
        const selector = document.getElementById('project-selector');
        selector.innerHTML = '';
        Object.keys(this.projects).forEach(id => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = this.projects[id].name;
            option.selected = id === this.currentProjectId;
            selector.appendChild(option);
        });
    }

    renderProjectTitle() {
        document.getElementById('project-title').value = this.getCurrentProject().name;
        document.querySelector('.project-name-label').textContent = this.projectLabel;
    }

    renderMilestones() {
        const list = document.getElementById('milestones-list');
        list.innerHTML = '';
        
        const project = this.getCurrentProject();
        project.milestones.forEach((milestone, index) => {
            const li = document.createElement('li');
            li.className = `milestone-item ${milestone.completed ? 'completed' : ''}`;
            li.innerHTML = `
                <div class="milestone-content">
                    <span class="milestone-number">${index + 1}</span>
                    <div class="milestone-text-content">
                        <span class="milestone-name" onclick="pm.editMilestoneName(${index})">${milestone.name}</span>
                        <div class="milestone-note" onclick="pm.editMilestoneNote(${index})">${milestone.note || '123'}</div>
                    </div>
                </div>
                <div class="milestone-actions">
                    <button class="toggle-btn ${milestone.completed ? 'completed' : ''}" onclick="pm.toggleMilestone(${index})" title="${milestone.completed ? '取消完成' : '标记完成'}">
                        <i class="fas ${milestone.completed ? 'fa-undo' : 'fa-check'}"></i>
                    </button>
                    <button class="delete-btn" onclick="pm.deleteMilestone(${index})" title="删除节点">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            list.appendChild(li);
        });

        // 更新节点计数
        const countElement = document.getElementById('milestones-count');
        if (countElement) {
            const completed = project.milestones.filter(m => m.completed).length;
            countElement.textContent = `${completed}/${project.milestones.length}`;
        }
    }

    renderProgressWheel() {
        const progress = this.getProgress();
        const circle = document.querySelector('.progress-wheel-fill');
        const text = document.querySelector('.progress-text');
        const circumference = 2 * Math.PI * 90;
        const offset = circumference - (progress / 100) * circumference;
        
        circle.style.strokeDashoffset = offset;
        
        // 根据进度动态改变颜色
        const hue = 35 - (progress / 100) * 5;
        circle.style.stroke = `hsl(${hue}, 100%, 60%)`;
        
        text.textContent = `${Math.round(progress)}%`;
    }

    editMilestoneName(index) {
        const milestone = this.getCurrentProject().milestones[index];
        const newName = prompt('请输入新的节点名称:', milestone.name);
        if (newName !== null && newName.trim() !== '') {
            milestone.name = newName.trim();
            this.save();
            this.render();
        }
    }

    editMilestoneNote(index) {
        const milestone = this.getCurrentProject().milestones[index];
        const newNote = prompt('请输入新的备注:', milestone.note);
        milestone.note = (newNote || '').trim();
        this.save();
        this.render();
    }

    editProjectLabel() {
        const newLabel = prompt('请输入新的标签名称:', this.projectLabel);
        if (newLabel !== null) {
            this.projectLabel = newLabel.trim() || 'name';
            localStorage.setItem('projectLabel', this.projectLabel);
            this.renderProjectTitle();
        }
    }

    updateTime() {
        const now = new Date();
        const timeString = now.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const timeElements = document.querySelectorAll('.current-time');
        timeElements.forEach(el => {
            el.textContent = timeString;
        });
    }

    closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.classList.add('hidden');
        });
    }

    bindEvents() {
        // 启动时间显示
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);

        // 项目标题编辑
        document.getElementById('project-title').addEventListener('change', (e) => {
            this.updateProjectName(e.target.value);
            this.renderProjectSelector();
        });

        // 项目选择
        document.getElementById('project-selector').addEventListener('change', (e) => {
            this.switchProject(e.target.value);
            this.closeSideMenu();
        });

        // 新建项目
        document.getElementById('new-project-btn').addEventListener('click', () => {
            const name = prompt('请输入新项目名称:');
            if (name) {
                const id = Date.now().toString();
                this.createProject(id, name);
                this.switchProject(id);
                this.showNotification('新项目创建成功！');
            }
        });

        // 添加节点
        document.getElementById('add-milestone-btn').addEventListener('click', () => {
            const noteInput = document.getElementById('new-milestone-note');
            const note = noteInput.value;
            
            if (this.addMilestone(note)) {
                noteInput.value = '';
            }
        });

        // 回车键添加节点
        document.getElementById('new-milestone-note').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('add-milestone-btn').click();
            }
        });

        // 导出报告
        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportReport();
        });

        // 统计信息
        document.getElementById('stats-btn').addEventListener('click', () => {
            this.showStats();
        });

        // 设置
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.showSettings();
        });

        // 分享项目
        document.getElementById('share-project-btn').addEventListener('click', () => {
            this.shareProject();
        });

        // 复制分享链接
        document.getElementById('copy-link-btn').addEventListener('click', () => {
            this.copyShareLink();
        });

        // 微信分享
        document.getElementById('wechat-share-btn').addEventListener('click', () => {
            this.wechatShare();
        });

        // 更多分享
        document.getElementById('more-share-btn').addEventListener('click', () => {
            this.moreShare();
        });

        // 清除数据
        document.getElementById('clear-data-btn').addEventListener('click', () => {
            this.clearData();
        });

        // 侧边菜单
        document.getElementById('menu-btn').addEventListener('click', () => {
            this.toggleSideMenu();
        });

        document.getElementById('close-menu-btn').addEventListener('click', () => {
            this.closeSideMenu();
        });

        // 关闭模态框
        document.querySelectorAll('.close-modal-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeAllModals();
            });
        });

        // 点击模态框外部关闭
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });

        // 点击侧边菜单外部关闭
        document.getElementById('side-menu').addEventListener('click', (e) => {
            if (e.target === document.getElementById('side-menu')) {
                this.closeSideMenu();
            }
        });

        // 键盘事件
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
                this.closeSideMenu();
            }
        });

        // 检查URL参数是否有共享链接
        const urlParams = new URLSearchParams(window.location.search);
        const shareId = urlParams.get('share');
        if (shareId) {
            this.joinSharedProject(shareId);
        }

        // 页面可见性变化时更新
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.render();
            }
        });

        // 窗口大小变化时重新渲染
        window.addEventListener('resize', () => {
            this.render();
            if (this.chart) {
                this.updateChart();
            }
        });
    }

    toggleSideMenu() {
        const menu = document.getElementById('side-menu');
        menu.classList.toggle('hidden');
    }

    closeSideMenu() {
        const menu = document.getElementById('side-menu');
        menu.classList.add('hidden');
    }
}

// 初始化应用
let pm;

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        pm = new ProjectManager();
    });
} else {
    pm = new ProjectManager();
}

// 防止页面意外关闭
window.addEventListener('beforeunload', (e) => {
    if (pm && pm.getCurrentProject().milestones.some(m => !m.completed)) {
        e.preventDefault();
        e.returnValue = '您有未完成的节点，确定要离开吗？';
    }
});

// 触摸手势支持
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
}, false);

document.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
}, false);

function handleSwipe() {
    const minSwipeDistance = 50;
    const swipeDistance = touchEndX - touchStartX;
    
    if (Math.abs(swipeDistance) > minSwipeDistance) {
        if (swipeDistance > 0) {
            // 右滑 - 打开侧边菜单
            pm.closeSideMenu();
        } else {
            // 左滑 - 关闭侧边菜单
            const menu = document.getElementById('side-menu');
            if (!menu.classList.contains('hidden')) {
                pm.closeSideMenu();
            }
        }
    }
}