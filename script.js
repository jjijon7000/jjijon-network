class SoundCloudWidgetController {
    constructor() {
        this.widget = null;
        this.currentTrack = null;
        this.isReady = false;
        this.progressInterval = null;
        this.isSkipping = false; 
    }

    initializeHiddenPlayer(playlistUrl) {
        let hidden = document.getElementById('hidden-sc-player');
        if (!hidden) {
            hidden = document.createElement('iframe');
            hidden.id = 'hidden-sc-player';
            hidden.style.display = 'none';
            hidden.src = `https://w.soundcloud.com/player/?url=${playlistUrl}&auto_play=false&hide_related=true&show_comments=false&show_reposts=false&visual=false`;
            document.body.appendChild(hidden);
        }

        this.showCorrectWidget();
        
        window.addEventListener('resize', () => this.showCorrectWidget());

        this.widget = SC.Widget(hidden);
        this.setupWidgetEvents(this.widget);
        this.bindUI();
    }

    showCorrectWidget() {
        const desktopWidget = document.getElementById('desktop-music-widget');
        const mobileWidget = document.getElementById('mobile-music-widget');
        
        if (window.innerWidth >= 769) {
            if (desktopWidget) desktopWidget.style.display = 'block';
            if (mobileWidget) mobileWidget.style.display = 'none';
            
            const followingContent = document.getElementById('following-content');
            const skillsContent = document.getElementById('skills-content');
            
            if (followingContent && followingContent.style.display !== 'none' ||
                skillsContent && skillsContent.style.display !== 'none') {
                showTab('about');
            }
        } else {
            if (desktopWidget) desktopWidget.style.display = 'none';
            if (mobileWidget) mobileWidget.style.display = 'block';
        }
    }

    setupWidgetEvents(widget) {
        widget.bind(SC.Widget.Events.READY, () => {
            this.isReady = true;
            this.updateTrackInfo(widget);
        });
        widget.bind(SC.Widget.Events.PLAY, () => {
            if (this.isSkipping) {
                setTimeout(() => {
                    this.widget.seekTo(0);
                    this.isSkipping = false;
                }, 100);
            }
            this.refreshPlayButton();
            this.updateTrackInfo(widget);
            this.startProgress();
        });
        widget.bind(SC.Widget.Events.PAUSE, () => {
            this.refreshPlayButton();
            this.stopProgress(false);
        });
        widget.bind(SC.Widget.Events.FINISH, () => {
            this.stopProgress(true);
            widget.skip(0);
            widget.play();
        });
        widget.bind(SC.Widget.Events.PLAY_PROGRESS, (e) => {
            this.updateProgress(e);
        });
    }

    updateTrackInfo(widget) {
        widget.getCurrentSound((sound) => {
            if (sound && sound !== this.currentTrack) {
                this.currentTrack = sound;
                this.displayCurrentTrack(sound);
            }
        });
    }

    displayCurrentTrack(sound) {
        const widgets = ['desktop-mw-track', 'mobile-mw-track'];
        const containerWidths = [170, 150];
        
        widgets.forEach((trackId, index) => {
            this.updateTrackDisplay(trackId, sound, containerWidths[index]);
        });
        
        const openButtons = ['desktop-mw-open', 'mobile-mw-open'];
        openButtons.forEach(buttonId => {
            const openBtn = document.getElementById(buttonId);
            if (openBtn) {
                openBtn.onclick = () => window.open(sound.permalink_url, '_blank');
            }
        });
    }

    updateTrackDisplay(trackId, sound, containerWidth) {
        const trackDiv = document.getElementById(trackId);
        if (!trackDiv) return;
        
        const content = `<strong>${sound.title}</strong><br><span style="opacity:0.7;">${sound.user.username}</span>`;
        trackDiv.innerHTML = content;
        
        trackDiv.classList.remove('scrolling');
        
        setTimeout(() => {
            const tempElement = document.createElement('div');
            tempElement.style.position = 'absolute';
            tempElement.style.visibility = 'hidden';
            tempElement.style.whiteSpace = 'nowrap';
            tempElement.style.fontSize = '11px';
            tempElement.style.fontWeight = 'bold';
            tempElement.innerHTML = sound.title;
            document.body.appendChild(tempElement);
            
            const titleWidth = tempElement.offsetWidth;
            
            document.body.removeChild(tempElement);
            
            if (titleWidth > containerWidth) {
                const overflowAmount = titleWidth - containerWidth;
                const baseDuration = 8;
                const speedMultiplier = Math.max(0.5, Math.min(2, overflowAmount / 100));
                const animationDuration = baseDuration * speedMultiplier;
                
                const scrollContent = `<strong>${sound.title}</strong>`;
                trackDiv.innerHTML = `
                    <div class="title-container" style="height: 14px; overflow: hidden; width: 100%; margin-bottom: 2px;">
                        <div class="scroll-content" style="white-space: nowrap; display: inline-block; animation: marquee-${containerWidth} ${animationDuration}s linear infinite;">${scrollContent}</div>
                    </div>
                    <div style="opacity:0.7;">${sound.user.username}</div>
                `;
                trackDiv.classList.add('scrolling');
                
                this.addMarqueeKeyframes(containerWidth);
            }
        }, 100);
    }

    addMarqueeKeyframes(containerWidth) {
        const keyframeName = `marquee-${containerWidth}`;
        if (!document.getElementById(`keyframes-${containerWidth}`)) {
            const style = document.createElement('style');
            style.id = `keyframes-${containerWidth}`;
            style.textContent = `
                @keyframes ${keyframeName} {
                    0% { transform: translateX(0%); }
                    25% { transform: translateX(0%); }
                    75% { transform: translateX(calc(-100% + ${containerWidth}px)); }
                    100% { transform: translateX(calc(-100% + ${containerWidth}px)); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    formatDuration(ms) {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    togglePlayback() { 
        if (this.widget) {
            this.widget.isPaused((paused) => {
                if (paused) {
                    this.widget.seekTo(0);
                }
                this.widget.toggle();
            });
        }
    }

    nextTrack() { 
        if (this.widget) {
            this.widget.getSounds((sounds) => {
                this.widget.getCurrentSoundIndex((index) => {
                    if (index === sounds.length - 1) {
                        this.isSkipping = true;
                        this.widget.skip(0);
                        this.widget.play();
                    } else {
                        this.isSkipping = true;
                        this.widget.next();
                    }
                });
            });
        }
    }

    previousTrack() { 
        if (this.widget) {
            this.isSkipping = true;
            this.widget.prev();
        }
    }

    getPlaylistInfo() {
        if (!this.widget) return;
        this.widget.getSounds((sounds) => {
        });
    }

    bindUI() {
        const buttonConfig = [
            { ids: ['desktop-mw-play', 'mobile-mw-play'], action: () => this.togglePlayback() },
            { ids: ['desktop-mw-prev', 'mobile-mw-prev'], action: () => this.previousTrack() },
            { ids: ['desktop-mw-next', 'mobile-mw-next'], action: () => this.nextTrack() }
        ];

        buttonConfig.forEach(({ ids, action }) => {
            ids.forEach(id => {
                const button = document.getElementById(id);
                if (button) button.onclick = action;
            });
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !e.target.closest('input,textarea')) {
                e.preventDefault();
                this.togglePlayback();
            }
        });
    }

    refreshPlayButton() {
        if (!this.widget) return;
        this.widget.isPaused((paused) => {
            ['desktop-mw-play', 'mobile-mw-play'].forEach(id => {
                const btn = document.getElementById(id);
                if (btn) btn.textContent = paused ? '▶️' : '⏸️';
            });
        });
    }

    startProgress() {
        if (this.progressInterval) return;
        this.progressInterval = setInterval(() => {
            if (!this.widget) return;
            this.widget.getPosition((pos) => {
                this.widget.getDuration((dur) => {
                    this.setProgress(pos / dur);
                });
            });
        }, 1000);
    }

    stopProgress(reset) {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
        if (reset) this.setProgress(0);
    }

    updateProgress(e) {
        if (!e) return;
        if (e.duration) this.setProgress(e.currentPosition / e.duration);
    }

    setProgress(ratio) {
        ['desktop-mw-progress-bar', 'mobile-mw-progress-bar'].forEach(id => {
            const bar = document.getElementById(id);
            if (bar) bar.style.width = `${Math.min(100, Math.max(0, ratio * 100))}%`;
        });
    }
}

let soundCloudController;

window.addEventListener('load', function() {
    const playlistUrl = "https%3A//soundcloud.com/1017underwrld/sets/web";
    soundCloudController = new SoundCloudWidgetController();
    
    setTimeout(() => {
        soundCloudController.initializeHiddenPlayer(playlistUrl);
        setTimeout(() => soundCloudController.getPlaylistInfo(), 1500);
    }, 500);

    setTimeout(function() {
        document.getElementById('preloader').style.display = 'none';
        var main = document.getElementById('main-content');
        main.classList.add('visible');
        
        setTimeout(function() {
            const aboutContent = document.getElementById('about-content');
            animateChirpsIn(aboutContent);
        }, 50); 
    }, 1000);
    
    setTimeout(function() {
        var modal = document.getElementById('custom-modal');
        modal.style.display = 'flex';
        setTimeout(function() {
            modal.classList.add('show');
        }, 10); 
    }, 3000);
    
  
    document.querySelector('#custom-modal [aria-label="Close"]').onclick = function() {
        var modal = document.getElementById('custom-modal');
        modal.classList.remove('show');
        setTimeout(function() {
            modal.style.display = 'none';
        }, 300); 
    };
});

const TAB_CONFIG = {
    about: { content: 'about-content', tabs: ['about-tab', 'sidebar-about-tab'] },
    experiences: { content: 'experiences-content', tabs: ['experiences-tab', 'sidebar-experiences-tab'] },
    projects: { content: 'projects-content', tabs: ['projects-tab', 'sidebar-projects-tab'] },
    skills: { content: 'skills-content', tabs: ['skills-tab', 'sidebar-skills-tab'] },
    photos: { content: 'photos-content', tabs: ['photos-tab', 'sidebar-photos-tab'] },
    following: { content: 'following-content', tabs: ['following-tab'] }
};

function showTab(tabName) {
    const allContentIds = Object.values(TAB_CONFIG).map(config => config.content);
    const allTabIds = Object.values(TAB_CONFIG).flatMap(config => config.tabs);

    document.querySelectorAll('.chirp').forEach(chirp => {
        chirp.classList.remove('animate-in');
        chirp.style.opacity = '0';
        chirp.style.transform = 'translateY(20px)';
    });

    allContentIds.forEach(contentId => {
        const element = document.getElementById(contentId);
        if (element && element.style.display !== 'none') {
            element.classList.add('fade-out');
        }
    });

    setTimeout(() => {
        allContentIds.forEach(contentId => {
            const element = document.getElementById(contentId);
            if (element) element.style.display = 'none';
        });

        allTabIds.forEach(tabId => {
            const element = document.getElementById(tabId);
            if (element) element.classList.remove('active');
        });

        allContentIds.forEach(contentId => {
            const element = document.getElementById(contentId);
            if (element) element.classList.remove('fade-out');
        });

        const config = TAB_CONFIG[tabName];
        if (config) {
            const contentElement = document.getElementById(config.content);
            if (contentElement) {
                contentElement.style.display = 'block';
                animateChirpsIn(contentElement);
            }

            config.tabs.forEach(tabId => {
                const tabElement = document.getElementById(tabId);
                if (tabElement) tabElement.classList.add('active');
            });
        }
    }, 300);
}

function animateChirpsIn(container) {
    const chirps = container.querySelectorAll('.chirp');
    
    setTimeout(() => {
        chirps.forEach(chirp => {
            chirp.style.opacity = '';
            chirp.style.transform = '';
            chirp.classList.add('animate-in');
        });
    }, 50);
}

document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const closeBtn = document.querySelector('.image-modal-close');
    
    document.querySelectorAll('.photo-gallery img').forEach(img => {
        img.addEventListener('click', function() {
            modal.style.display = 'block';
            modalImage.src = this.src;
            modalImage.alt = this.alt;
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);
        });
    });
    
    function closeModal() {
        modal.classList.remove('show');
        modal.classList.add('hide');
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.remove('hide');
        }, 300); 
    }
    
    closeBtn.addEventListener('click', closeModal);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            closeModal();
        }
    });
});

// showFollowing removed; all tabs now use showTab

