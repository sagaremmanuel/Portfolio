const modal = document.getElementById('videoModal');
const modalVideo = document.getElementById('modalVideo');
const modalTitle = document.getElementById('modalTitle');
const playButtons = document.querySelectorAll('.play-chip');
const closeTriggers = document.querySelectorAll('[data-close-video]');
const revealItems = document.querySelectorAll('.reveal');
const scenes = document.querySelectorAll('.scene');
const sceneMotionState = new WeakMap();
let targetScrollY = window.scrollY || 0;
let currentScrollY = targetScrollY;
let scrollAnimationFrame = 0;

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function openVideo(videoSrc, posterSrc, title) {
    if (!modal || !modalVideo) {
        return;
    }

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    modalVideo.pause();
    modalVideo.src = videoSrc;
    if (posterSrc) {
        modalVideo.poster = posterSrc;
    }
    modalVideo.load();
    modalVideo.play().catch(() => {});

    if (modalTitle) {
        modalTitle.textContent = title || 'Preview';
    }
}

function closeVideo() {
    if (!modal || !modalVideo) {
        return;
    }

    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    modalVideo.pause();
    modalVideo.removeAttribute('src');
    modalVideo.load();
    document.body.style.overflow = '';
}

playButtons.forEach((button) => {
    button.addEventListener('click', () => {
        openVideo(button.dataset.video, button.dataset.poster, button.dataset.title);
    });
});

closeTriggers.forEach((trigger) => {
    trigger.addEventListener('click', closeVideo);
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeVideo();
    }
});

function updateSceneTransitions(scrollY = window.scrollY || 0) {
    const viewportHeight = window.innerHeight || 1;
    const viewportCenter = scrollY + viewportHeight * 0.5;

    scenes.forEach((scene, index) => {
        const stage = scene.querySelector('.scene-stage');
        if (!stage) {
            return;
        }

        const start = scene.offsetTop;
        const height = scene.offsetHeight || viewportHeight;
        const sceneCenter = start + height * 0.5;
        const distance = clamp(Math.abs(viewportCenter - sceneCenter) / viewportHeight, 0, 1);
        const progress = clamp((viewportCenter - start) / height, 0, 1);
        const isActive = progress > 0.15 && progress < 0.95;
        const isLeaving = viewportCenter > sceneCenter;
        const isEntering = viewportCenter <= sceneCenter;

        scene.classList.toggle('is-active', isActive);
        scene.classList.toggle('is-leaving', isLeaving);
        scene.classList.toggle('is-entering', isEntering);

        const targetTranslateY = clamp((0.5 - progress) * 110, -78, 78);
        const targetTranslateZ = -distance * 180;
        const targetScale = 1 - distance * 0.075;
        const targetOpacity = 0.72 + (1 - distance) * 0.28;

        const state = sceneMotionState.get(stage) || {
            translateY: targetTranslateY,
            translateZ: targetTranslateZ,
            scale: targetScale,
            opacity: targetOpacity,
        };

        state.translateY += (targetTranslateY - state.translateY) * 0.12;
        state.translateZ += (targetTranslateZ - state.translateZ) * 0.12;
        state.scale += (targetScale - state.scale) * 0.12;
        state.opacity += (targetOpacity - state.opacity) * 0.14;

        sceneMotionState.set(stage, state);

        stage.style.transform = `translate3d(0, ${state.translateY.toFixed(2)}px, ${state.translateZ.toFixed(2)}px) scale(${state.scale.toFixed(4)})`;
        stage.style.opacity = state.opacity.toFixed(3);

        const zIndex = scenes.length - index;
        scene.style.zIndex = String(zIndex);
    });
}

function requestSceneUpdate() {
    targetScrollY = window.scrollY || 0;

    if (scrollAnimationFrame) {
        return;
    }

    const animate = () => {
        currentScrollY += (targetScrollY - currentScrollY) * 0.14;
        updateSceneTransitions(currentScrollY);

        if (Math.abs(targetScrollY - currentScrollY) > 0.35) {
            scrollAnimationFrame = window.requestAnimationFrame(animate);
            return;
        }

        currentScrollY = targetScrollY;
        updateSceneTransitions(currentScrollY);
        scrollAnimationFrame = 0;
    };

    scrollAnimationFrame = window.requestAnimationFrame(animate);
}

window.addEventListener('scroll', requestSceneUpdate, { passive: true });
window.addEventListener('resize', requestSceneUpdate);
window.addEventListener('load', requestSceneUpdate);
requestSceneUpdate();

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.15,
    rootMargin: '0px 0px -60px 0px',
});

revealItems.forEach((item) => revealObserver.observe(item));