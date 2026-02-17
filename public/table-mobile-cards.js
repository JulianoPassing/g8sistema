// ========== CONVERSÃO DE TABELAS PARA CARDS NO MOBILE ==========
// Adiciona data-label aos td baseado nos th para layout de cards
// Uso: adicione a classe "table-mobile-cards" ao .table-responsive ou .table-container

document.addEventListener('DOMContentLoaded', function() {
  if (window.innerWidth > 768) return;
  
  document.querySelectorAll('.table-container.table-mobile-cards table, .table-responsive.table-mobile-cards table').forEach(function(table) {
    const headers = [];
    table.querySelectorAll('thead th').forEach(function(th, i) {
      headers[i] = th.textContent.trim();
    });
    
    table.querySelectorAll('tbody tr').forEach(function(tr) {
      tr.querySelectorAll('td').forEach(function(td, i) {
        if (headers[i]) {
          td.setAttribute('data-label', headers[i]);
        }
      });
    });
  });
});

window.addEventListener('resize', function() {
  if (window.innerWidth <= 768) {
    document.querySelectorAll('.table-container.table-mobile-cards table, .table-responsive.table-mobile-cards table, .table-responsive.table-mobile-cards table').forEach(function(table) {
      const headers = [];
      table.querySelectorAll('thead th').forEach(function(th, i) {
        headers[i] = th.textContent.trim();
      });
      table.querySelectorAll('tbody tr').forEach(function(tr) {
        tr.querySelectorAll('td').forEach(function(td, i) {
          if (headers[i]) td.setAttribute('data-label', headers[i]);
        });
      });
    });
  }
});
