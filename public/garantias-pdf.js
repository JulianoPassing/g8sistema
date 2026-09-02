/**
 * PDF de garantias — layout alinhado aos pedidos Pantaneiro.
 * Valor unitário e subtotal já saem com desconto prazo + volume aplicados.
 */
(function (global) {
  function parseDados(garantia) {
    let dados = garantia && garantia.dados;
    if (typeof dados === 'string') {
      try {
        dados = JSON.parse(dados);
      } catch {
        dados = {};
      }
    }
    return dados || {};
  }

  function nomeEmpresa(slug) {
    const s = String(slug || '').toLowerCase();
    if (s === 'pantaneiro5') return 'Pantaneiro 5';
    if (s === 'pantaneiro7') return 'Pantaneiro 7';
    return slug ? String(slug).toUpperCase() : 'Garantia';
  }

  function formatMoneyBR(v) {
    return `R$ ${Number(v || 0).toFixed(2)}`;
  }

  function fatorDescontos(descontos) {
    const prazo = Number(descontos && descontos.prazo) || 0;
    const volume = Number(descontos && descontos.volume) || 0;
    return (1 - prazo / 100) * (1 - volume / 100);
  }

  function precoUnitarioComDesconto(item, descontos) {
    const preco = Number(item.preco != null ? item.preco : item.PRECO) || 0;
    const extra = Number(item.descontoExtra) || 0;
    return preco * (1 - extra / 100) * fatorDescontos(descontos);
  }

  function calcTotais(itens, descontos) {
    let subtotal = 0;
    (itens || []).forEach((item) => {
      const preco = Number(item.preco != null ? item.preco : item.PRECO) || 0;
      const qtd = Number(item.quantidade) || 0;
      const extra = Number(item.descontoExtra) || 0;
      subtotal += preco * qtd * (1 - extra / 100);
    });
    const total = subtotal * fatorDescontos(descontos);
    return { subtotal, total };
  }

  /**
   * @param {object} garantia - { id, empresa, dados, data_garantia }
   * @param {{ download?: boolean, filename?: string }} [opts]
   */
  function gerarPDFGarantia(garantia, opts) {
    opts = opts || {};
    if (!global.jspdf || !global.jspdf.jsPDF) {
      alert('Biblioteca de PDF não carregada. Recarregue a página.');
      return null;
    }

    const dados = parseDados(garantia);
    const cliente = dados.cliente || {};
    const itens = Array.isArray(dados.itens) ? dados.itens : [];
    const descontos = dados.descontos || { prazo: 0, volume: 0 };
    const totaisCalc = calcTotais(itens, descontos);
    const total =
      dados.total != null && dados.total !== '' ? Number(dados.total) : totaisCalc.total;
    const subtotal =
      dados.subtotal != null && dados.subtotal !== ''
        ? Number(dados.subtotal)
        : totaisCalc.subtotal;

    const empresaSlug = garantia.empresa || dados.empresa || '';
    const titulo = `Garantia - ${nomeEmpresa(empresaSlug)}`;
    const prazoPagamento = dados.prazo || cliente.prazo || 'A combinar';
    const observacoes = dados.observacoes || cliente.obs || 'Nenhuma.';

    const { jsPDF } = global.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    const dataRef = garantia.data_garantia ? new Date(garantia.data_garantia) : new Date();
    const dataFmt = `${String(dataRef.getDate()).padStart(2, '0')}/${String(
      dataRef.getMonth() + 1
    ).padStart(2, '0')}/${dataRef.getFullYear()}`;

    const drawHeaderAndFooter = (data) => {
      try {
        const logoImg = new Image();
        logoImg.src = '/logo.png';
        doc.addImage(logoImg, 'PNG', margin, 10, 90, 15);
      } catch (e) {
        /* ignore logo */
      }
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(titulo, pageWidth - margin, 18, { align: 'right' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Data: ${dataFmt}`, pageWidth - margin, 24, { align: 'right' });
      if (garantia.id) {
        doc.setFontSize(9);
        doc.text(`Nº ${garantia.id}`, pageWidth - margin, 29, { align: 'right' });
      }
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.text(`Página ${data.pageNumber} de ${pageCount}`, pageWidth / 2, pageHeight - 10, {
        align: 'center'
      });
    };

    drawHeaderAndFooter({ pageNumber: 1 });

    doc.autoTable({
      startY: 32,
      theme: 'grid',
      head: [
        [
          {
            content: 'DADOS DO CLIENTE',
            colSpan: 4,
            styles: {
              halign: 'center',
              fontStyle: 'bold',
              fillColor: [230, 230, 230],
              textColor: 30
            }
          }
        ]
      ],
      body: [
        ['Cliente:', { content: cliente.razao || cliente.nome || 'N/A', colSpan: 3 }],
        ['CNPJ:', cliente.cnpj || 'N/A', 'I.E.:', cliente.ie || 'N/A'],
        ['Telefone:', cliente.telefone || 'N/A', 'E-mail:', cliente.email || 'N/A'],
        [
          'Endereço:',
          {
            content: `${cliente.endereco || ''}${cliente.bairro ? ', ' + cliente.bairro : ''}`.trim() || 'N/A',
            colSpan: 3
          }
        ],
        [
          'Cidade/UF:',
          `${cliente.cidade || ''}/${cliente.estado || ''}`,
          'CEP:',
          cliente.cep || ''
        ]
      ],
      styles: { fontSize: 8, cellPadding: 1.5 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 22 },
        2: { fontStyle: 'bold', cellWidth: 20 }
      },
      margin: { left: margin, right: margin }
    });

    let startY = doc.autoTable.previous.finalY + 7;

    const head = [['Ref.', 'Produto', 'Cor', 'Tamanho', 'Qtd.', 'Vlr. Unit.', 'Subtotal']];
    const body = itens.map((item) => {
      const qtd = Number(item.quantidade) || 0;
      const unit = precoUnitarioComDesconto(item, descontos);
      const linha = unit * qtd;
      return [
        item.REFERENCIA || item.ref || '',
        item.DESCRICAO || item.DESCRIÇÃO || item.descricao || '',
        item.cor || '',
        item.tamanho || '',
        String(qtd),
        formatMoneyBR(unit),
        formatMoneyBR(linha)
      ];
    });

    doc.autoTable({
      head,
      body,
      startY,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', valign: 'middle' },
      headStyles: {
        fillColor: [44, 62, 80],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 16 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 22 },
        3: { cellWidth: 22 },
        4: { cellWidth: 12, halign: 'center' },
        5: { cellWidth: 24, halign: 'right' },
        6: { cellWidth: 24, halign: 'right' }
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) drawHeaderAndFooter(data);
      },
      margin: { top: 32, bottom: 15, left: margin, right: margin }
    });

    let finalY = doc.autoTable.previous.finalY;

    const summaryData = [];
    summaryData.push(['Subtotal sem desconto:', formatMoneyBR(subtotal)]);
    const prazoPct = Number(descontos.prazo) || 0;
    const volumePct = Number(descontos.volume) || 0;
    if (prazoPct > 0) {
      summaryData.push([
        `Desconto Prazo (${String(prazoPct).replace('.', ',')}%):`,
        `- ${formatMoneyBR(subtotal * (prazoPct / 100))}`
      ]);
    }
    if (volumePct > 0) {
      const baseVol = subtotal * (1 - prazoPct / 100);
      summaryData.push([
        `Desconto Volume (${String(volumePct).replace('.', ',')}%):`,
        `- ${formatMoneyBR(baseVol * (volumePct / 100))}`
      ]);
    }
    summaryData.push(['', '']);
    summaryData.push([
      { content: 'Total da Garantia:', styles: { fontStyle: 'bold', fontSize: 10 } },
      { content: formatMoneyBR(total), styles: { fontStyle: 'bold', fontSize: 10 } }
    ]);

    const motivos = itens
      .filter((it) => it.motivo)
      .map((it) => `${it.REFERENCIA || ''}: ${it.motivo}`)
      .filter(Boolean);
    const obsText = `Prazo Pagamento: ${prazoPagamento}\nEmpresa: ${nomeEmpresa(empresaSlug)}\n\nObservações:\n${observacoes}${
      motivos.length ? '\n\nMotivos/defeitos:\n' + motivos.join('\n') : ''
    }`;

    const finalTableBody = [];
    const leftColumn = {
      content: obsText,
      rowSpan: summaryData.length,
      styles: { valign: 'top', fontSize: 9 }
    };
    for (let i = 0; i < summaryData.length; i++) {
      const row = [];
      if (i === 0) row.push(leftColumn);
      row.push(summaryData[i][0]);
      row.push(summaryData[i][1]);
      finalTableBody.push(row);
    }

    doc.autoTable({
      startY: finalY + 6,
      theme: 'plain',
      body: finalTableBody,
      styles: { fontSize: 9, cellPadding: 1.5 },
      columnStyles: {
        0: { cellWidth: pageWidth - margin * 2 - 90 },
        1: { cellWidth: 50, fontStyle: 'bold' },
        2: { cellWidth: 40, halign: 'right' }
      },
      margin: { left: margin, right: margin }
    });

    const razaoSafe = String(cliente.razao || 'Cliente')
      .replace(/[\\/:*?"<>|]/g, '')
      .slice(0, 40);
    const idPart = garantia.id ? `#${garantia.id} ` : '';
    const filename =
      opts.filename ||
      `G8 Garantia ${idPart}${nomeEmpresa(empresaSlug)} - ${razaoSafe} - ${dataFmt.replace(/\//g, '-')}.pdf`;

    if (opts.download === false) {
      const blobUrl = doc.output('bloburl');
      window.open(blobUrl, '_blank');
    } else {
      doc.save(filename);
    }
    return doc;
  }

  global.gerarPDFGarantia = gerarPDFGarantia;
})(typeof window !== 'undefined' ? window : globalThis);
