// ========== MENU HAMBÚRGUER MOBILE - G8SISTEMA ==========

function init() {
    // Verificar se está em mobile
    if (window.innerWidth <= 768) {
        initMobileMenu();
    }

    // Logo clicável para voltar ao início (mobile e desktop)
    setupLogoClick();

    // Reinicializar no resize
    if (!window._mobileMenuResizeBound) {
        window._mobileMenuResizeBound = true;
        window.addEventListener('resize', function() {
            if (window.innerWidth <= 768) {
                initMobileMenu();
            } else {
                closeMobileMenu();
            }
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

function setupLogoClick() {
    const pathname = window.location.pathname || window.location.href || '';
    
    // Definir URL do "início" conforme o contexto
    let homeUrl = 'painel.html';
    if (pathname.includes('b2b')) {
        homeUrl = 'b2b-pedidos.html';
    } else if (pathname.includes('distribuicao')) {
        homeUrl = 'distribuicao.html';
    } else if (pathname.includes('index') || pathname.endsWith('/')) {
        homeUrl = 'index.html';
    }
    
    // Encontrar logo (img ou container)
    const logo = document.querySelector('#logo') || 
                 document.querySelector('.header-center img') || 
                 document.querySelector('.header img') ||
                 document.querySelector('header img') ||
                 document.querySelector('.logo img');
    
    if (!logo) return;
    
    // Evitar duplicar o link
    if (logo.closest('a')) return;
    
    const link = document.createElement('a');
    link.href = homeUrl;
    link.style.cssText = 'display: flex; align-items: center; text-decoration: none; cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent;';
    link.setAttribute('aria-label', 'Voltar ao início');
    
    logo.parentNode.insertBefore(link, logo);
    link.appendChild(logo);
}

function initMobileMenu() {
    // Criar elementos do menu se não existirem
    if (!document.querySelector('.mobile-menu-toggle')) {
        createMobileMenuElements();
    }

    // Adicionar event listeners
    setupMobileMenuEvents();
}

function createMobileMenuElements() {
    const header = document.querySelector('.header-top') || document.querySelector('.header') || document.querySelector('header');
    if (!header) return;

    // Criar botão hambúrguer (padrão jp.cobrancas - com acessibilidade)
    const menuToggle = document.createElement('button');
    menuToggle.className = 'mobile-menu-toggle';
    menuToggle.type = 'button';
    menuToggle.setAttribute('aria-label', 'Abrir menu de navegação');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-controls', 'mobile-menu');
    menuToggle.style.touchAction = 'manipulation';
    menuToggle.innerHTML = '<span class="menu-icon"></span>';

    // Inserir no início do header
    header.insertBefore(menuToggle, header.firstChild);

    // Criar menu mobile
    const mobileMenu = document.createElement('div');
    mobileMenu.className = 'mobile-menu';
    mobileMenu.id = 'mobile-menu';
    
    // Criar overlay
    const overlay = document.createElement('div');
    overlay.className = 'mobile-menu-overlay';

    // Obter informações do usuário (suporta painel interno e B2B)
    const userInfo = document.querySelector('#user-info') || document.querySelector('#clienteNome');
    const logoutButton = document.querySelector('#logout-button, .btn-logout');
    const voltarButton = document.querySelector('.btn-voltar');

    // Construir itens do menu
    let menuItems = '';

    // Ícones Font Awesome (fallback para emoji se FA não carregado)
    const iconUser = '<i class="fas fa-user" aria-hidden="true"></i>';
    const iconHome = '<i class="fas fa-home" aria-hidden="true"></i>';
    const iconUsers = '<i class="fas fa-users" aria-hidden="true"></i>';
    const iconClipboard = '<i class="fas fa-clipboard-list" aria-hidden="true"></i>';
    const iconBox = '<i class="fas fa-box" aria-hidden="true"></i>';
    const iconArrowLeft = '<i class="fas fa-arrow-left" aria-hidden="true"></i>';
    const iconLogout = '<i class="fas fa-sign-out-alt" aria-hidden="true"></i>';

    // Informações do usuário
    if (userInfo) {
        const userName = userInfo.textContent.trim();
        menuItems += `
            <div class="mobile-menu-item user-info">
                <span class="icon">${iconUser}</span>
                <span>${userName}</span>
            </div>
        `;
    }

    // Botão voltar (se existir)
    if (voltarButton) {
        const voltarHref = voltarButton.getAttribute('href') || '#';
        const voltarText = voltarButton.textContent.trim() || 'Voltar ao Painel';
        menuItems += `
            <a href="${voltarHref}" class="mobile-menu-item voltar">
                <span class="icon">${iconArrowLeft}</span>
                <span>${voltarText}</span>
            </a>
        `;
    }

    // Links de navegação específicos por página (pathname + href para diferentes deploys)
    const currentPage = window.location.pathname || window.location.href || '';
    
    if (currentPage.includes('painel.html')) {
        menuItems += `
            <a href="painel-clientes.html" class="mobile-menu-item">
                <span class="icon">${iconUsers}</span>
                <span>Clientes</span>
            </a>
            <a href="pedidos.html" class="mobile-menu-item">
                <span class="icon">${iconClipboard}</span>
                <span>Pedidos</span>
            </a>
        `;
    }

    if (currentPage.includes('painel-clientes.html')) {
        menuItems += `
            <a href="painel.html" class="mobile-menu-item">
                <span class="icon">${iconHome}</span>
                <span>Painel Principal</span>
            </a>
            <a href="pedidos.html" class="mobile-menu-item">
                <span class="icon">${iconClipboard}</span>
                <span>Pedidos</span>
            </a>
        `;
    }

    if (currentPage.includes('pedidos.html') && !currentPage.includes('b2b')) {
        menuItems += `
            <a href="painel.html" class="mobile-menu-item">
                <span class="icon">${iconHome}</span>
                <span>Painel Principal</span>
            </a>
            <a href="painel-clientes.html" class="mobile-menu-item">
                <span class="icon">${iconUsers}</span>
                <span>Clientes</span>
            </a>
        `;
    }

    if (currentPage.includes('b2b-pedidos')) {
        menuItems += `
            <a href="b2b-pantaneiro5.html" class="mobile-menu-item">
                <span class="icon">${iconBox}</span>
                <span>Pantaneiro 5</span>
            </a>
            <a href="b2b-pantaneiro7.html" class="mobile-menu-item">
                <span class="icon">${iconBox}</span>
                <span>Pantaneiro 7</span>
            </a>
            <a href="b2b-steitz.html" class="mobile-menu-item">
                <span class="icon">${iconBox}</span>
                <span>Steitz</span>
            </a>
        `;
    }

    if ((currentPage.includes('pantaneiro') || currentPage.includes('steitz') || currentPage.includes('bkb')) && !currentPage.includes('b2b')) {
        menuItems += `
            <a href="painel.html" class="mobile-menu-item">
                <span class="icon">${iconHome}</span>
                <span>Painel Principal</span>
            </a>
            <a href="painel-clientes.html" class="mobile-menu-item">
                <span class="icon">${iconUsers}</span>
                <span>Clientes</span>
            </a>
            <a href="pedidos.html" class="mobile-menu-item">
                <span class="icon">${iconClipboard}</span>
                <span>Pedidos</span>
            </a>
        `;
    }

    if (currentPage.includes('distribuicao')) {
        menuItems += `
            <a href="painel.html" class="mobile-menu-item">
                <span class="icon">${iconHome}</span>
                <span>Painel Principal</span>
            </a>
            <a href="pedidos.html" class="mobile-menu-item">
                <span class="icon">${iconClipboard}</span>
                <span>Pedidos</span>
            </a>
        `;
    }

    if ((currentPage.includes('b2b-pantaneiro') || currentPage.includes('b2b-steitz'))) {
        menuItems += `
            <a href="b2b-pedidos.html" class="mobile-menu-item voltar">
                <span class="icon">${iconArrowLeft}</span>
                <span>Voltar aos Pedidos</span>
            </a>
        `;
    }

    // Logout sempre no final
    if (logoutButton) {
        const logoutText = logoutButton.textContent.trim() || 'Sair';
        const hasCustomLogout = logoutButton.getAttribute('onclick');
        menuItems += `
            <a href="${hasCustomLogout ? '#' : 'index.html'}" class="mobile-menu-item logout" data-logout-custom="${hasCustomLogout ? 'true' : 'false'}">
                <span class="icon">${iconLogout}</span>
                <span>${logoutText}</span>
            </a>
        `;
    } else {
        menuItems += `
            <a href="index.html" class="mobile-menu-item logout">
                <span class="icon">${iconLogout}</span>
                <span>Sair</span>
            </a>
        `;
    }

    mobileMenu.innerHTML = menuItems;

    // Adicionar ao DOM
    document.body.appendChild(overlay);
    document.body.appendChild(mobileMenu);
}

function setupMobileMenuEvents() {
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    const overlay = document.querySelector('.mobile-menu-overlay');

    if (!menuToggle || !mobileMenu || !overlay) return;
    if (menuToggle.dataset.eventsBound === 'true') return;
    menuToggle.dataset.eventsBound = 'true';

    // Toggle do menu
    menuToggle.addEventListener('click', function() {
        const isActive = mobileMenu.classList.contains('active');
        if (isActive) closeMobileMenu();
        else openMobileMenu();
        menuToggle.setAttribute('aria-expanded', !isActive);
        menuToggle.setAttribute('aria-label', !isActive ? 'Fechar menu de navegação' : 'Abrir menu de navegação');
    });

    // Fechar menu ao clicar no overlay
    overlay.addEventListener('click', closeMobileMenu);

    // Fechar menu ao clicar em um item (exceto user-info)
    const menuItems = document.querySelectorAll('.mobile-menu-item');
    menuItems.forEach(item => {
        if (!item.classList.contains('user-info')) {
            item.addEventListener('click', function(e) {
                if (item.classList.contains('logout') && item.getAttribute('data-logout-custom') === 'true') {
                    e.preventDefault();
                    const logoutBtn = document.querySelector('.btn-logout');
                    if (logoutBtn) logoutBtn.click();
                    else if (typeof window.logout === 'function') window.logout();
                }
                setTimeout(closeMobileMenu, 100);
            });
        }
    });

    // Fechar menu ao pressionar ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
            closeMobileMenu();
        }
    });
}

function openMobileMenu() {
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    const overlay = document.querySelector('.mobile-menu-overlay');

    if (menuToggle && mobileMenu && overlay) {
        menuToggle.classList.add('active');
        menuToggle.setAttribute('aria-expanded', 'true');
        menuToggle.setAttribute('aria-label', 'Fechar menu de navegação');
        mobileMenu.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeMobileMenu() {
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    const overlay = document.querySelector('.mobile-menu-overlay');

    if (menuToggle && mobileMenu && overlay) {
        menuToggle.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-label', 'Abrir menu de navegação');
        mobileMenu.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Função para atualizar o menu quando o usuário mudar
function updateMobileMenuUser(userName) {
    const userMenuItem = document.querySelector('.mobile-menu-item.user-info span:last-child');
    if (userMenuItem) {
        userMenuItem.textContent = userName;
    }
}

// Função para adicionar item customizado ao menu
function addCustomMenuItem(icon, text, href, className = '') {
    const mobileMenu = document.querySelector('.mobile-menu');
    if (!mobileMenu) return;

    const menuItem = document.createElement('a');
    menuItem.href = href;
    menuItem.className = `mobile-menu-item ${className}`;
    menuItem.innerHTML = `
        <span class="icon">${icon}</span>
        <span>${text}</span>
    `;

    // Inserir antes do logout
    const logoutItem = document.querySelector('.mobile-menu-item.logout');
    if (logoutItem) {
        mobileMenu.insertBefore(menuItem, logoutItem);
    } else {
        mobileMenu.appendChild(menuItem);
    }

    // Adicionar event listener
    menuItem.addEventListener('click', function() {
        setTimeout(closeMobileMenu, 100);
    });
}

// Função para remover item do menu
function removeCustomMenuItem(className) {
    const menuItem = document.querySelector(`.mobile-menu-item.${className}`);
    if (menuItem) {
        menuItem.remove();
    }
}

// Exportar funções globais
window.MobileMenu = {
    open: openMobileMenu,
    close: closeMobileMenu,
    updateUser: updateMobileMenuUser,
    addItem: addCustomMenuItem,
    removeItem: removeCustomMenuItem
}; 