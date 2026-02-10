// ========== SISTEMA DE AUTENTICAÇÃO MELHORADO ==========

class AuthSystem {
  constructor() {
    this.apiUrl = '/api/auth';
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  // Função para fazer login via API (mais seguro)
  async login(username, password) {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      
      if (data.success) {
        return { success: true, user: data.user };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Erro na autenticação:', error);
      return { success: false, message: 'Erro de conexão. Tente novamente.' };
    }
  }

  // Fallback para o sistema antigo (mantém compatibilidade)
  loginFallback(username, password) {
    // Mantém o sistema antigo como fallback
    const validUsers = {
      g8: "repres",
      juliano: "123456",
      gustavo: "123456",
      escritorio: "123456",
    };

    if (validUsers[username] && validUsers[username] === password) {
      return { success: true, user: username };
    } else {
      return { success: false, message: 'Usuário ou senha inválidos' };
    }
  }

  // Sistema híbrido - tenta API primeiro, fallback depois
  async authenticate(username, password) {
    try {
      // Tenta autenticação via API primeiro
      const apiResult = await this.login(username, password);
      if (apiResult.success) {
        return apiResult;
      }
    } catch (error) {
      console.log('API indisponível, usando fallback local');
    }

    // Se API falhar, usa sistema local
    return this.loginFallback(username, password);
  }

  // Melhorar feedback visual
  showMessage(element, message, type = 'error') {
    element.textContent = message;
    element.style.display = 'block';
    element.className = `${type}-message`;
    
    // Adicionar animação suave
    element.style.opacity = '0';
    element.style.transform = 'translateY(-10px)';
    
    requestAnimationFrame(() => {
      element.style.transition = 'all 0.3s ease';
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';
    });
  }

  // Loading state melhorado
  setLoading(button, loading) {
    const spinner = button.querySelector('.spinner');
    const icon = button.querySelector('i:not(.spinner)');
    const text = button.querySelector('span:last-child');

    if (loading) {
      button.disabled = true;
      button.style.cursor = 'wait';
      if (spinner) spinner.style.display = 'inline-block';
      if (icon) icon.style.display = 'none';
      if (text) text.textContent = 'Verificando...';
      
      // Adicionar classe para animação
      button.classList.add('loading');
    } else {
      button.disabled = false;
      button.style.cursor = 'pointer';
      if (spinner) spinner.style.display = 'none';
      if (icon) icon.style.display = 'inline-block';
      if (text) text.textContent = 'Entrar';
      
      button.classList.remove('loading');
    }
  }
}

// Exportar para uso global
window.AuthSystem = AuthSystem;
