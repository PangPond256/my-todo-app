(function () {
    const DEMO_USER = {
        name: "Demo User",
        email: "demo@todoapp.com",
        color: "bg-blue"
    };

    const MODE_BANNER_HEIGHT = 48;

    function getPath() {
        return window.location.pathname || "/";
    }

    function isDemoPage() {
        return getPath() === "/" || getPath() === "/demo";
    }

    function isAuthPage() {
        return getPath() === "/login" || getPath() === "/register";
    }

    function isRealAppPage() {
        return [
            "/dashboard",
            "/tasks-page",
            "/members-page",
            "/categories-page"
        ].includes(getPath());
    }

    function isRealContextPage() {
        return isRealAppPage() || isAuthPage();
    }

    function isDemoSession() {
        return localStorage.getItem("demoMode") === "true";
    }

    function ensureDemoSession() {
        if (!isDemoPage()) return;

        const existingUser = localStorage.getItem("user");
        const demoMode = localStorage.getItem("demoMode");

        if (!existingUser || demoMode !== "true") {
            localStorage.setItem("user", JSON.stringify(DEMO_USER));
            localStorage.setItem("demoMode", "true");
        }
    }

    function clearDemoSessionOnly() {
        localStorage.removeItem("demoMode");

        const userData = localStorage.getItem("user");
        if (!userData) return;

        try {
            const parsed = JSON.parse(userData);
            if (parsed?.email === DEMO_USER.email) {
                localStorage.removeItem("user");
            }
        } catch (error) {
            localStorage.removeItem("user");
        }
    }

    function clearReviewerSession() {
        localStorage.removeItem("demoMode");
        localStorage.removeItem("reviewerMode");
        localStorage.removeItem("user");
    }

    function getCurrentUser() {
        if (isDemoPage()) {
            ensureDemoSession();
        }

        const userData = localStorage.getItem("user");
        if (!userData) return null;

        try {
            return JSON.parse(userData);
        } catch (error) {
            console.error("Parse user error:", error);
            return null;
        }
    }

    function removeBodyBannerState() {
        document.body.classList.remove("has-mode-banner");
        document.body.style.removeProperty("--mode-banner-height");
    }

    function applyBodyBannerState() {
        document.body.classList.add("has-mode-banner");
        document.body.style.setProperty("--mode-banner-height", `${MODE_BANNER_HEIGHT}px`);
    }

    function createBannerContent() {
        if (isDemoSession()) {
            return `
                <div class="mode-banner-inner">
                    <strong>Demo Version</strong>
                    <span class="mode-banner-dot">•</span>
                    <span class="mode-banner-text">ข้อมูลในหน้านี้ไม่กระทบโปรแกรมจริง</span>
                    <a href="/login"
                       class="mode-banner-link"
                       onclick="event.preventDefault(); window.reviewerMode.goToRealProgram();">
                       ไปใช้งานโปรแกรมจริง
                    </a>
                </div>
            `;
        }

        if (isRealContextPage()) {
            return `
                <div class="mode-banner-inner">
                    <strong>Real Program</strong>
                    <span class="mode-banner-dot">•</span>
                    <span class="mode-banner-text">คุณกำลังใช้งานข้อมูลจริง</span>
                    <a href="/demo"
                       class="mode-banner-link"
                       onclick="event.preventDefault(); window.reviewerMode.goToDemo();">
                       กลับไปหน้า Demo
                    </a>
                </div>
            `;
        }

        return "";
    }

    function buildTopBanner() {
        const oldBanner = document.getElementById("mode-banner");
        if (oldBanner) oldBanner.remove();

        removeBodyBannerState();

        const shouldShowBanner = isDemoSession() || isRealContextPage();
        if (!shouldShowBanner) return;

        const html = createBannerContent();
        if (!html) return;

        const banner = document.createElement("div");
        banner.id = "mode-banner";
        banner.style.cssText = [
            "position:fixed",
            "top:0",
            "left:0",
            "right:0",
            "width:100%",
            "height:48px",
            "z-index:99999",
            "display:flex",
            "align-items:center",
            "justify-content:center",
            "padding:0 16px",
            "box-sizing:border-box",
            "background:linear-gradient(90deg,#0f172a,#1e293b)",
            "color:#ffffff",
            "box-shadow:0 4px 14px rgba(15,23,42,.18)"
        ].join(";");

        banner.innerHTML = html;
        document.body.prepend(banner);
        applyBodyBannerState();
    }

    async function reviewerFetch(url, options = {}) {
        const nextOptions = { ...options };
        nextOptions.headers = {
            ...(options.headers || {}),
            ...(isDemoSession() ? { "x-demo-mode": "true" } : {})
        };

        return fetch(url, nextOptions);
    }

    function goToRealProgram() {
        clearDemoSessionOnly();
        window.location.href = "/login";
    }

    function goToDemo() {
        localStorage.setItem("user", JSON.stringify(DEMO_USER));
        localStorage.setItem("demoMode", "true");
        window.location.href = "/demo";
    }

    function isReviewerMode() {
        return false;
    }

    function applyReadOnlyUI() {
        return;
    }

    function injectBannerStyles() {
        const oldStyle = document.getElementById("mode-banner-style");
        if (oldStyle) return;

        const style = document.createElement("style");
        style.id = "mode-banner-style";
        style.textContent = `
            .mode-banner-inner{
                display:flex;
                align-items:center;
                justify-content:center;
                gap:12px;
                width:100%;
                max-width:1200px;
                white-space:nowrap;
                overflow:hidden;
                text-overflow:ellipsis;
                font-size:14px;
                font-weight:600;
            }

            .mode-banner-dot{
                opacity:.65;
                flex-shrink:0;
            }

            .mode-banner-text{
                color:#93c5fd;
                overflow:hidden;
                text-overflow:ellipsis;
            }

            .mode-banner-link{
                color:#ffffff;
                text-decoration:underline;
                font-weight:700;
                flex-shrink:0;
            }

            body.has-mode-banner{
                padding-top:var(--mode-banner-height, 48px) !important;
            }

            body.has-mode-banner .navbar{
                top:var(--mode-banner-height, 48px) !important;
            }

            @media (max-width: 768px){
                #mode-banner{
                    height:auto !important;
                    min-height:48px;
                    padding:8px 12px !important;
                }

                .mode-banner-inner{
                    gap:8px;
                    font-size:12px;
                    flex-wrap:wrap;
                    line-height:1.4;
                }

                body.has-mode-banner{
                    padding-top:56px !important;
                }

                body.has-mode-banner .navbar{
                    top:56px !important;
                }
            }
        `;

        document.head.appendChild(style);
    }

    window.reviewerMode = {
        DEMO_USER,
        isReviewerMode,
        isDemoSession,
        ensureReviewerMode: ensureDemoSession,
        getCurrentUser,
        applyReadOnlyUI,
        reviewerFetch,
        buildReviewerBanner: buildTopBanner,
        clearReviewerSession,
        clearDemoSessionOnly,
        goToRealProgram,
        goToDemo
    };

    document.addEventListener("DOMContentLoaded", () => {
        if (isDemoPage()) {
            ensureDemoSession();
        }

        injectBannerStyles();
        buildTopBanner();
    });
})();