// ========== MENU HAMBÚRGUER MOBILE - G8SISTEMA ==========

document.addEventListener('DOMContentLoaded', function() {
    // Verificar se está em mobile
    if (window.innerWidth <= 768) {
        initMobileMenu();
    }

    // Reinicializar no resize
    window.addEventListener('resize', function() {
        if (window.innerWidth <= 768) {
            initMobileMenu();
        } else {
            closeMobileMenu();
        }
    });
});

function initMobileMenu() {
    // Criar elementos do menu se não existirem
    if (!document.querySelector('.mobile-menu-toggle')) {
        createMobileMenuElements();
    }

    // Adicionar event listeners
    setupMobileMenuEvents();
}

function createMobileMenuElements() {
    const header = document.querySelector('.header-top') || document.querySelector('header');
    if (!header) return;

    // Criar botão hambúrguer
    const menuToggle = document.createElement('button');
    menuToggle.className = 'mobile-menu-toggle';
    menuToggle.innerHTML = `
        <span></span>
        <span></span>
        <span></span>
    `;

    // Inserir no início do header
    header.insertBefore(menuToggle, header.firstChild);

    // Criar menu mobile
    const mobileMenu = document.createElement('div');
    mobileMenu.className = 'mobile-menu';
    
    // Criar overlay
    const overlay = document.createElement('div');
    overlay.className = 'mobile-menu-overlay';

    // Obter informações do usuário
    const userInfo = document.querySelector('#user-info');
    const logoutButton = document.querySelector('#logout-button, .btn-logout');
    const voltarButton = document.querySelector('.btn-voltar');

    // Construir itens do menu
    let menuItems = '';

    // Informações do usuário
    if (userInfo) {
        const userName = userInfo.textContent.trim();
        menuItems += `
            <div class="mobile-menu-item user-info">
                <span class="icon">👤</span>
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
                <span class="icon">🔙</span>
                <span>${voltarText}</span>
            </a>
        `;
    }

    // Links de navegação específicos por página
    const currentPage = window.location.pathname;
    
    if (currentPage.includes('painel.html')) {
        menuItems += `
            <a href="painel-clientes.html" class="mobile-menu-item">
                <span class="icon">👥</span>
                <span>Clientes</span>
            </a>
            <a href="pedidos.html" class="mobile-menu-item">
                <span class="icon">📋</span>
                <span>Pedidos</span>
            </a>
        `;
    }

    if (currentPage.includes('painel-clientes.html')) {
        menuItems += `
            <a href="painel.html" class="mobile-menu-item">
                <span class="icon">🏠</span>
                <span>Painel Principal</span>
            </a>
            <a href="pedidos.html" class="mobile-menu-item">
                <span class="icon">📋</span>
                <span>Pedidos</span>
            </a>
        `;
    }

    if (currentPage.includes('pedidos.html')) {
        menuItems += `
            <a href="painel.html" class="mobile-menu-item">
                <span class="icon">🏠</span>
                <span>Painel Principal</span>
            </a>
            <a href="painel-clientes.html" class="mobile-menu-item">
                <span class="icon">👥</span>
                <span>Clientes</span>
            </a>
        `;
    }

    if (currentPage.includes('pantaneiro') || currentPage.includes('steitz')) {
        menuItems += `
            <a href="painel.html" class="mobile-menu-item">
                <span class="icon">🏠</span>
                <span>Painel Principal</span>
            </a>
            <a href="painel-clientes.html" class="mobile-menu-item">
                <span class="icon">👥</span>
                <span>Clientes</span>
            </a>
            <a href="pedidos.html" class="mobile-menu-item">
                <span class="icon">📋</span>
                <span>Pedidos</span>
            </a>
        `;
    }

    // Logout sempre no final
    if (logoutButton) {
        const logoutAction = logoutButton.getAttribute('onclick') || 
                           logoutButton.getAttribute('href') || 
                           "window.location.href='index.html'";
        
        const logoutText = logoutButton.textContent.trim() || 'Sair';
        
        menuItems += `
            <a href="#" onclick="${logoutAction.replace('onclick=', '').replace(/['"]/g, '')}" class="mobile-menu-item logout">
                <span class="icon">🚪</span>
                <span>${logoutText}</span>
            </a>
        `;
    } else {
        // Fallback para logout se não encontrou botão
        menuItems += `
            <a href="index.html" class="mobile-menu-item logout">
                <span class="icon">🚪</span>
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

    // Toggle do menu
    menuToggle.addEventListener('click', function() {
        const isActive = mobileMenu.classList.contains('active');
        
        if (isActive) {
            closeMobileMenu();
        } else {
            openMobileMenu();
        }
    });

    // Fechar menu ao clicar no overlay
    overlay.addEventListener('click', closeMobileMenu);

    // Fechar menu ao clicar em um item (exceto user-info)
    const menuItems = document.querySelectorAll('.mobile-menu-item');
    menuItems.forEach(item => {
        if (!item.classList.contains('user-info')) {
            item.addEventListener('click', function() {
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