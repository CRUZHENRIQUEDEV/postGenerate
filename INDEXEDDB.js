(function () {
  const allowedOrigins = [
    "https://cruzhenriquedev.github.io",
    "https://cruzhenriquedev.github.io/TopograficPoints",
  ];

  const isFileProtocol = window.location.protocol === "file:";
  const isNotHttps = window.location.protocol !== "https:";
  const originNotAllowed = !allowedOrigins.some(
    (o) => window.location.origin === o || window.location.href.startsWith(o),
  );

  if (isFileProtocol || isNotHttps || originNotAllowed) {
    document.open();
    document.write("");
    document.close();
    return;
  }
})();

// ========== VERSÃO 6.1 - CARDS COMPACTOS, SEM TEMPLATES ==========

// ========== VARIÁVEIS GLOBAIS ==========
let db = null;
let currentObra = null;
let userProfile = "Inspetor";
let messages = [];
let completionStates = new Map();
let messageResponses = new Map();
let currentFilter = "all";
let searchQuery = "";

// ========== INICIALIZAÇÃO ==========
function initialize() {
  initializeTheme();
  initializeUserProfile();
  initializeDB();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}

// ========== INDEXEDDB ==========
function initializeDB() {
  const request = indexedDB.open("FormatadorDB", 1);

  request.onerror = function () {
    showAlert("Erro ao abrir banco de dados", "error");
  };

  request.onsuccess = function (event) {
    db = event.target.result;
    loadObrasList();
  };

  request.onupgradeneeded = function (event) {
    db = event.target.result;

    if (!db.objectStoreNames.contains("obras")) {
      const obraStore = db.createObjectStore("obras", { keyPath: "codigo" });
      obraStore.createIndex("dataCriacao", "dataCriacao", { unique: false });
      obraStore.createIndex("dataModificacao", "dataModificacao", {
        unique: false,
      });
    }
  };
}

function saveObraToDb(obraData) {
  return new Promise(function (resolve, reject) {
    const transaction = db.transaction(["obras"], "readwrite");
    const store = transaction.objectStore("obras");
    const request = store.put(obraData);

    request.onsuccess = function () {
      setSyncStatus("syncing");
      setTimeout(function () {
        setSyncStatus("synced");
      }, 500);
      resolve();
    };

    request.onerror = function () {
      reject(new Error("Erro ao salvar obra"));
    };
  });
}

function loadObraFromDb(codigo) {
  return new Promise(function (resolve, reject) {
    const transaction = db.transaction(["obras"], "readonly");
    const store = transaction.objectStore("obras");
    const request = store.get(codigo);

    request.onsuccess = function (event) {
      resolve(event.target.result);
    };

    request.onerror = function () {
      reject(new Error("Erro ao carregar obra"));
    };
  });
}

function deleteObraFromDb(codigo) {
  return new Promise(function (resolve, reject) {
    const transaction = db.transaction(["obras"], "readwrite");
    const store = transaction.objectStore("obras");
    const request = store.delete(codigo);

    request.onsuccess = function () {
      resolve();
    };

    request.onerror = function () {
      reject(new Error("Erro ao deletar obra"));
    };
  });
}

function getAllObras() {
  return new Promise(function (resolve, reject) {
    const transaction = db.transaction(["obras"], "readonly");
    const store = transaction.objectStore("obras");
    const request = store.getAll();

    request.onsuccess = function (event) {
      resolve(event.target.result);
    };

    request.onerror = function () {
      reject(new Error("Erro ao listar obras"));
    };
  });
}

// ========== GERENCIAMENTO DE OBRAS ==========
function showCreateObraModal() {
  document.getElementById("obraModalTitle").innerHTML =
    "<span>📚</span> Nova Obra";
  document.getElementById("obraForm").reset();
  document.getElementById("obraCodigo").disabled = false;
  document.getElementById("obraModal").classList.add("show");
}

function closeObraModal() {
  document.getElementById("obraModal").classList.remove("show");
}

function saveObra(event) {
  event.preventDefault();

  const codigo = document
    .getElementById("obraCodigo")
    .value.trim()
    .toUpperCase();
  const nome = document.getElementById("obraNome").value.trim() || codigo;
  const jsonText = document.getElementById("obraJson").value.trim();

  try {
    const parsedMessages = parseInput(jsonText);

    if (parsedMessages.length === 0) {
      showAlert("JSON inválido ou sem mensagens", "error");
      return;
    }

    const obraData = {
      codigo: codigo,
      nome: nome,
      dataCriacao: new Date().toISOString(),
      dataModificacao: new Date().toISOString(),
      messages: parsedMessages,
      completionStates: {},
      messageResponses: {},
      userProfile: userProfile,
      totalMensagens: parsedMessages.length,
      totalRespostas: 0,
    };

    saveObraToDb(obraData)
      .then(function () {
        showAlert('Obra "' + nome + '" criada com sucesso!', "success");
        closeObraModal();
        loadObrasList();
        loadObra(codigo);
      })
      .catch(function (error) {
        showAlert(error.message, "error");
      });
  } catch (error) {
    showAlert("Erro ao processar JSON: " + error.message, "error");
  }
}

function loadObra(codigo) {
  loadObraFromDb(codigo)
    .then(function (obra) {
      if (!obra) {
        showAlert("Obra não encontrada", "error");
        return;
      }

      currentObra = obra;
      messages = obra.messages;

      completionStates = new Map();
      Object.keys(obra.completionStates).forEach(function (key) {
        completionStates.set(parseInt(key), obra.completionStates[key]);
      });

      messageResponses = new Map();
      Object.keys(obra.messageResponses).forEach(function (key) {
        messageResponses.set(parseInt(key), obra.messageResponses[key]);
      });

      userProfile = obra.userProfile;
      selectProfile(userProfile);

      updateCurrentObraUI();
      renderMessages();

      document.getElementById("messagesSection").style.display = "block";
      document.getElementById("filtersBar").style.display = "block";

      showAlert('Obra "' + obra.nome + '" carregada!', "success");
      loadObrasList();
    })
    .catch(function (error) {
      showAlert(error.message, "error");
    });
}

function closeCurrentObra() {
  if (
    confirm(
      "Deseja realmente fechar a obra atual? Certifique-se de ter salvo tudo.",
    )
  ) {
    currentObra = null;
    messages = [];
    completionStates.clear();
    messageResponses.clear();

    document.getElementById("obraCurrentSection").style.display = "none";
    document.getElementById("messagesSection").style.display = "none";
    document.getElementById("filtersBar").style.display = "none";

    loadObrasList();
    showAlert("Obra fechada", "success");
  }
}

function updateCurrentObraUI() {
  if (!currentObra) {
    document.getElementById("obraCurrentSection").style.display = "none";
    return;
  }

  document.getElementById("obraCurrentSection").style.display = "block";
  document.getElementById("currentObraNome").textContent = currentObra.nome;
  document.getElementById("currentObraCodigo").textContent =
    "🔑 " + currentObra.codigo;

  const total = messages.length;
  let done = 0;
  let totalRespondable = 0;

  messages.forEach(function (message, index) {
    if (message.role !== userProfile) {
      totalRespondable++;
      if (completionStates.get(index)) {
        done++;
      }
    }
  });

  const pending = totalRespondable - done;
  const progress =
    totalRespondable > 0 ? Math.round((done / totalRespondable) * 100) : 0;

  const statsHtml = `
        <div class="stat-card">
            <div class="stat-value">${total}</div>
            <div class="stat-label">Total</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${totalRespondable}</div>
            <div class="stat-label">Para Responder</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" style="color: var(--success)">${done}</div>
            <div class="stat-label">Corrigidas</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" style="color: var(--warning)">${pending}</div>
            <div class="stat-label">Pendentes</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" style="color: var(--purple)">${progress}%</div>
            <div class="stat-label">Progresso</div>
        </div>
    `;

  document.getElementById("obraStats").innerHTML = statsHtml;
}

function autoSaveCurrentObra() {
  if (!currentObra) return;

  currentObra.messages = messages;
  currentObra.dataModificacao = new Date().toISOString();

  const statesObj = {};
  completionStates.forEach(function (value, key) {
    statesObj[key] = value;
  });
  currentObra.completionStates = statesObj;

  const responsesObj = {};
  messageResponses.forEach(function (value, key) {
    responsesObj[key] = value;
  });
  currentObra.messageResponses = responsesObj;

  let totalRespostas = 0;
  messageResponses.forEach(function () {
    totalRespostas++;
  });
  currentObra.totalRespostas = totalRespostas;

  saveObraToDb(currentObra)
    .then(function () {
      updateCurrentObraUI();
      loadObrasList();
    })
    .catch(function (error) {
      console.error("Auto-save falhou:", error);
    });
}

function loadObrasList() {
  getAllObras()
    .then(function (obras) {
      const container = document.getElementById("obrasList");

      if (obras.length === 0) {
        container.innerHTML = `
                <div class="empty-obras">
                    <div class="empty-obras-icon">📚</div>
                    <p>Nenhuma obra cadastrada ainda</p>
                </div>
            `;
        return;
      }

      obras.sort(function (a, b) {
        return new Date(b.dataModificacao) - new Date(a.dataModificacao);
      });

      let html = "";
      obras.forEach(function (obra) {
        const isActive = currentObra && currentObra.codigo === obra.codigo;
        const totalRespondable =
          obra.totalMensagens > 0 ? obra.totalMensagens : 1;
        const progress = Math.round(
          (obra.totalRespostas / totalRespondable) * 100,
        );

        html += `
                <div class="obra-card ${isActive ? "active" : ""}" onclick="loadObra('${obra.codigo}')">
                    <div class="obra-card-main">
                        <div class="obra-card-title">${obra.nome}</div>
                        <div class="obra-card-code">${obra.codigo}</div>
                    </div>
                    <div class="obra-card-stats">
                        <div class="obra-card-stat">
                            <span>📊</span> ${obra.totalMensagens}
                        </div>
                        <div class="obra-card-stat" style="color: var(--success)">
                            <span>✅</span> ${obra.totalRespostas}
                        </div>
                        <div class="obra-card-stat" style="color: var(--purple)">
                            <span>📈</span> ${progress}%
                        </div>
                    </div>
                    <div class="obra-card-actions">
                        <button class="icon-btn" onclick="event.stopPropagation(); exportObraTxt('${obra.codigo}')" title="Exportar">
                            💾
                        </button>
                        <button class="icon-btn" onclick="event.stopPropagation(); deleteObra('${obra.codigo}')" title="Excluir">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
      });

      container.innerHTML = html;
    })
    .catch(function (error) {
      showAlert("Erro ao carregar obras: " + error.message, "error");
    });
}

function toggleObrasList() {
  const list = document.getElementById("obrasListContainer");
  const icon = document.getElementById("toggleObrasIcon");
  const text = document.getElementById("toggleObrasText");

  if (list.style.display === "none" || list.style.display === "") {
    list.style.display = "block";
    icon.textContent = "🙈";
    text.textContent = "Ocultar Obras";
  } else {
    list.style.display = "none";
    icon.textContent = "👁️";
    text.textContent = "Ver Obras";
  }
}

function deleteObra(codigo) {
  if (
    !confirm(
      'Tem certeza que deseja excluir a obra "' +
        codigo +
        '"? Esta ação não pode ser desfeita!',
    )
  ) {
    return;
  }

  deleteObraFromDb(codigo)
    .then(function () {
      showAlert("Obra excluída com sucesso", "success");

      if (currentObra && currentObra.codigo === codigo) {
        closeCurrentObra();
      }

      loadObrasList();
    })
    .catch(function (error) {
      showAlert("Erro ao excluir obra: " + error.message, "error");
    });
}

// ========== ATUALIZAÇÃO DE OBRA (MERGE) ==========
function showUpdateObraModal() {
  if (!currentObra) {
    showAlert("Carregue uma obra primeiro", "error");
    return;
  }

  document.getElementById("updateObraModal").classList.add("show");
}

function closeUpdateObraModal() {
  document.getElementById("updateObraModal").classList.remove("show");
}

function updateObraJson(event) {
  event.preventDefault();

  const jsonText = document.getElementById("updateObraJson").value.trim();

  try {
    const newMessages = parseInput(jsonText);

    if (newMessages.length === 0) {
      showAlert("JSON inválido ou sem mensagens", "error");
      return;
    }

    const mergeResult = mergeMessages(messages, newMessages);

    messages = mergeResult.mergedMessages;
    currentObra.messages = messages;
    currentObra.totalMensagens = messages.length;

    autoSaveCurrentObra();
    renderMessages();
    closeUpdateObraModal();

    showAlert(
      "Obra atualizada! " +
        mergeResult.kept +
        " mantidas, " +
        mergeResult.added +
        " novas adicionadas",
      "success",
    );
  } catch (error) {
    showAlert("Erro ao processar JSON: " + error.message, "error");
  }
}

function mergeMessages(oldMessages, newMessages) {
  const merged = [];
  const oldNormalized = new Map();

  oldMessages.forEach(function (msg, index) {
    const key = normalizeMessageForMatching(msg.text);
    oldNormalized.set(key, { msg: msg, index: index });
  });

  let kept = 0;
  let added = 0;

  newMessages.forEach(function (newMsg) {
    const key = normalizeMessageForMatching(newMsg.text);
    const existing = oldNormalized.get(key);

    if (existing) {
      merged.push(existing.msg);
      oldNormalized.delete(key);
      kept++;
    } else {
      merged.push(newMsg);
      added++;
    }
  });

  return {
    mergedMessages: merged,
    kept: kept,
    added: added,
  };
}

// ========== EXPORTAÇÕES ==========
function exportCurrentObraTxt() {
  if (!currentObra) {
    showAlert("Nenhuma obra carregada", "error");
    return;
  }

  exportObraTxt(currentObra.codigo);
}

function exportObraTxt(codigo) {
  loadObraFromDb(codigo)
    .then(function (obra) {
      if (!obra) return;

      const content = generateObraTxtContent(obra);
      const filename =
        codigo + "_" + obra.nome.replace(/[^a-z0-9]/gi, "_") + ".txt";

      downloadFile(content, filename, "text/plain");
      showAlert("Arquivo TXT exportado!", "success");
    })
    .catch(function (error) {
      showAlert("Erro ao exportar: " + error.message, "error");
    });
}

function generateObraTxtContent(obra) {
  let content = "";

  content += "╔════════════════════════════════════════════════════════════╗\n";
  content += "║         CONTROLE DE CORREÇÕES - FORMATADOR v6.1          ║\n";
  content +=
    "╚════════════════════════════════════════════════════════════╝\n\n";

  content += "OBRA: " + obra.nome + "\n";
  content += "CÓDIGO: " + obra.codigo + "\n";
  content += "PERFIL: " + obra.userProfile + "\n";
  content +=
    "CRIAÇÃO: " + new Date(obra.dataCriacao).toLocaleString("pt-BR") + "\n";
  content +=
    "MODIFICAÇÃO: " +
    new Date(obra.dataModificacao).toLocaleString("pt-BR") +
    "\n";
  content += "TOTAL MENSAGENS: " + obra.totalMensagens + "\n";
  content += "TOTAL RESPOSTAS: " + obra.totalRespostas + "\n\n";
  content +=
    "══════════════════════════════════════════════════════════════\n\n";

  obra.messages.forEach(function (message, index) {
    const isOwnMessage = message.role === obra.userProfile;
    const completed = obra.completionStates[index] || false;
    const response = obra.messageResponses[index];

    let status = "";
    if (isOwnMessage) {
      status = " 📤 SUA MENSAGEM";
    } else {
      status = completed ? " ✅ CORRIGIDO" : " ⏳ PENDENTE";
    }

    content += "MENSAGEM ORIGINAL" + status + "\n";
    content += message.text + "\n";
    content += message.date + "\n";
    content += message.author + " - " + message.role + "\n\n";

    if (response && !isOwnMessage) {
      content += "SUA RESPOSTA:\n";
      content += response.text + "\n";
      content += "Respondido em: " + response.date + "\n";
    }

    if (index < obra.messages.length - 1) {
      content +=
        "──────────────────────────────────────────────────────────\n\n";
    }
  });

  content +=
    "\n══════════════════════════════════════════════════════════════\n";
  content += "║ Formatador de Mensagens v6.1 - Sistema Profissional     ║\n";
  content += "╚════════════════════════════════════════════════════════════╝";

  return content;
}

function exportAllObrasZip() {
  getAllObras()
    .then(function (obras) {
      if (obras.length === 0) {
        showAlert("Nenhuma obra para exportar", "error");
        return;
      }

      const zip = new JSZip();

      let indexContent = "ÍNDICE DE OBRAS EXPORTADAS\n";
      indexContent += "Gerado em: " + new Date().toLocaleString("pt-BR") + "\n";
      indexContent += "Total de obras: " + obras.length + "\n\n";
      indexContent +=
        "═══════════════════════════════════════════════════════\n\n";

      obras.forEach(function (obra, idx) {
        const content = generateObraTxtContent(obra);
        const filename =
          obra.codigo + "_" + obra.nome.replace(/[^a-z0-9]/gi, "_") + ".txt";

        zip.file(filename, content);

        indexContent += idx + 1 + ". " + obra.nome + "\n";
        indexContent += "   Código: " + obra.codigo + "\n";
        indexContent += "   Arquivo: " + filename + "\n";
        indexContent += "   Mensagens: " + obra.totalMensagens + "\n";
        indexContent += "   Respostas: " + obra.totalRespostas + "\n\n";
      });

      zip.file("_INDEX.txt", indexContent);

      zip.generateAsync({ type: "blob" }).then(function (content) {
        const timestamp = new Date()
          .toISOString()
          .replace(/[:.]/g, "-")
          .split("T")[0];
        downloadFile(
          content,
          "formatador-backup-" + timestamp + ".zip",
          "application/zip",
        );
        showAlert(
          "Backup ZIP criado com " + obras.length + " obra(s)!",
          "success",
        );
      });
    })
    .catch(function (error) {
      showAlert("Erro ao exportar: " + error.message, "error");
    });
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

// ========== IMPORTAÇÃO ==========
function showImportModal() {
  document.getElementById("importModal").classList.add("show");
}

function closeImportModal() {
  document.getElementById("importModal").classList.remove("show");
}

function importObra() {
  const fileInput = document.getElementById("importFile");
  const file = fileInput.files[0];

  if (!file) {
    showAlert("Selecione um arquivo", "error");
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      const content = e.target.result;
      let parsedData;

      if (file.name.endsWith(".json")) {
        parsedData = JSON.parse(content);
      } else if (file.name.endsWith(".txt")) {
        parsedData = parseTxtFileForImport(content);
      } else {
        showAlert("Formato de arquivo não suportado", "error");
        return;
      }

      if (parsedData && parsedData.codigo) {
        saveObraToDb(parsedData).then(function () {
          showAlert("Obra importada com sucesso!", "success");
          closeImportModal();
          loadObrasList();
          loadObra(parsedData.codigo);
        });
      } else {
        showAlert("Arquivo inválido", "error");
      }
    } catch (error) {
      showAlert("Erro ao importar: " + error.message, "error");
    }
  };

  reader.readAsText(file, "utf-8");
}

function parseTxtFileForImport(content) {
  const lines = content.split("\n");
  let codigo = "";
  let nome = "";

  lines.forEach(function (line) {
    if (line.includes("CÓDIGO:")) {
      codigo = line.split("CÓDIGO:")[1].trim();
    }
    if (line.includes("OBRA:")) {
      nome = line.split("OBRA:")[1].trim();
    }
  });

  if (!codigo) return null;

  return {
    codigo: codigo,
    nome: nome || codigo,
    dataCriacao: new Date().toISOString(),
    dataModificacao: new Date().toISOString(),
    messages: [],
    completionStates: {},
    messageResponses: {},
    userProfile: "Inspetor",
    totalMensagens: 0,
    totalRespostas: 0,
  };
}

// ========== FILTROS ==========
function setFilter(filter) {
  currentFilter = filter;

  document.querySelectorAll(".filter-btn").forEach(function (btn) {
    btn.classList.remove("active");
  });

  document
    .querySelector('[data-filter="' + filter + '"]')
    .classList.add("active");

  applyFilters();
}

function applyFilters() {
  searchQuery = document.getElementById("searchInput").value.toLowerCase();

  document.querySelectorAll(".message-card").forEach(function (card) {
    const index = parseInt(card.getAttribute("data-message-id"));
    const message = messages[index];
    const isOwn = message.role === userProfile;
    const isCompleted = completionStates.get(index) || false;

    let show = true;

    if (currentFilter === "pending" && (isOwn || isCompleted)) show = false;
    if (currentFilter === "completed" && !isCompleted) show = false;
    if (currentFilter === "own" && !isOwn) show = false;

    if (searchQuery && !message.text.toLowerCase().includes(searchQuery)) {
      show = false;
    }

    if (show) {
      card.classList.remove("hidden");
    } else {
      card.classList.add("hidden");
    }
  });
}

// ========== MENSAGENS ==========
function parseInput(input) {
  try {
    const jsonData = JSON.parse(input);
    const messagesArray = Array.isArray(jsonData) ? jsonData : [jsonData];

    return messagesArray.map(function (msg) {
      return {
        text: msg.mensagem || msg.message || msg.texto || "",
        author: msg.nomeUsuario || msg.author || msg.usuario || "Usuário",
        role: msg.perfil || msg.role || msg.cargo || "Sistema",
        date: formatDateTime(
          msg.dataHistorico || msg.date || msg.data || new Date().toISOString(),
        ),
      };
    });
  } catch (jsonError) {
    return parseFormattedText(input);
  }
}

function parseFormattedText(text) {
  const messages = [];
  const lines = text
    .split("\n")
    .map(function (line) {
      return line.trim();
    })
    .filter(function (line) {
      return line;
    });

  let currentMessage = null;
  let messageText = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isDateLine(line)) {
      if (currentMessage && messageText) {
        messages.push({
          text: messageText.trim(),
          author: currentMessage.author,
          role: currentMessage.role,
          date: currentMessage.date,
        });
      }

      const dateMatch = line.match(
        /(\d{2}\/\d{2}\/\d{4}),?\s*(\d{2}:\d{2}:\d{2})/,
      );
      if (dateMatch) {
        currentMessage = {
          date: formatDateTime(dateMatch[1] + " " + dateMatch[2]),
          author: "Usuário",
          role: "Sistema",
        };
        messageText = "";
      }
      continue;
    }

    if (isAuthorLine(line)) {
      const parts = line.split(" - ");
      if (parts.length >= 2 && currentMessage) {
        currentMessage.author = parts[0].trim();
        currentMessage.role = parts[1].trim();
      }
      continue;
    }

    if (currentMessage) {
      if (messageText) messageText += " ";
      messageText += line;
    }
  }

  if (currentMessage && messageText) {
    messages.push({
      text: messageText.trim(),
      author: currentMessage.author,
      role: currentMessage.role,
      date: currentMessage.date,
    });
  }

  return messages;
}

function isDateLine(line) {
  return /\d{2}\/\d{2}\/\d{4}/.test(line);
}

function isAuthorLine(line) {
  return line.includes(" - ") && !line.match(/^\d+\./) && line.length < 100;
}

function formatDateTime(dateInput) {
  try {
    let date;

    if (typeof dateInput === "string") {
      if (dateInput.includes("/")) {
        const parts = dateInput.split(/[,\s]+/);
        const datePart = parts[0];
        const timePart = parts[1];
        const dateComponents = datePart.split("/");
        const day = parseInt(dateComponents[0], 10);
        const month = parseInt(dateComponents[1], 10);
        const year = parseInt(dateComponents[2], 10);

        if (timePart) {
          const timeComponents = timePart.split(":");
          const hour = parseInt(timeComponents[0], 10);
          const minute = parseInt(timeComponents[1], 10);
          const second = parseInt(timeComponents[2], 10) || 0;
          date = new Date(year, month - 1, day, hour, minute, second);
        } else {
          date = new Date(year, month - 1, day);
        }
      } else {
        date = new Date(dateInput);
      }
    } else {
      date = new Date(dateInput);
    }

    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "Data inválida";
  }
}

function normalizeMessageForMatching(text) {
  return text
    .toLowerCase()
    .replace(/^\d+\.\s*/g, "")
    .replace(/\t/g, " ")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function renderMessages() {
  const container = document.getElementById("messagesList");
  container.innerHTML = "";

  messages.forEach(function (message, index) {
    const isOwnMessage = message.role === userProfile;
    const isCompleted = completionStates.get(index) || false;
    const savedResponse = messageResponses.get(index);

    const messageCard = document.createElement("div");
    const cardClasses = ["message-card"];

    if (isOwnMessage) {
      cardClasses.push("own-message");
    } else {
      cardClasses.push("other-message");
      if (isCompleted) {
        cardClasses.push("completed");
      }
    }

    messageCard.className = cardClasses.join(" ");
    messageCard.setAttribute("data-message-id", index);

    let cardContent = '<div class="message-header">';

    if (!isOwnMessage) {
      cardContent +=
        '<div class="checkbox-container">' +
        '<input type="checkbox" class="message-checkbox" ' +
        (isCompleted ? "checked" : "") +
        ' onchange="toggleCompletion(' +
        index +
        ')">' +
        "</div>";
    }

    cardContent +=
      '<div class="message-content">' +
      '<div class="message-text">' +
      message.text +
      "</div>" +
      '<div class="message-meta">' +
      "<div>" +
      "<strong>" +
      message.author +
      "</strong> - " +
      message.role +
      "<br>" +
      "<small>" +
      message.date +
      "</small>" +
      "</div>";

    if (isOwnMessage) {
      cardContent +=
        '<span style="background: rgba(100, 116, 139, 0.2); color: var(--text-muted); padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;">📤 Sua Mensagem</span>';
    } else {
      cardContent +=
        '<span style="background: ' +
        (isCompleted ? "rgba(34, 197, 94, 0.2)" : "rgba(234, 179, 8, 0.2)") +
        "; color: " +
        (isCompleted ? "var(--success)" : "var(--warning)") +
        '; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;">' +
        (isCompleted ? "✅ Corrigido" : "⏳ Pendente") +
        "</span>";
    }

    cardContent += "</div>";

    if (!isOwnMessage) {
      cardContent +=
        '<div class="response-section">' +
        (savedResponse
          ? generateSavedResponseHtml(savedResponse, index)
          : generateResponseInputHtml(index)) +
        "</div>";
    }

    cardContent += "</div></div>";

    messageCard.innerHTML = cardContent;
    container.appendChild(messageCard);
  });

  updateStatusCounter();
  applyFilters();
}

function generateResponseInputHtml(index) {
  return (
    '<div style="margin-bottom: 10px;">' +
    '<label style="font-weight: 600; font-size: 14px; color: var(--text-primary);">💬 Sua Resposta:</label>' +
    "</div>" +
    '<textarea id="response-' +
    index +
    '" class="response-textarea" ' +
    'placeholder="Digite sua resposta..."></textarea>' +
    '<div style="display: flex; gap: 10px; margin-top: 10px;">' +
    '<button class="btn btn-primary btn-sm" onclick="saveResponse(' +
    index +
    ')">Salvar</button>' +
    "</div>"
  );
}

function generateSavedResponseHtml(response, index) {
  return (
    '<div class="saved-response">' +
    '<div class="saved-response-header">' +
    '<span style="font-size: 12px; font-weight: 600; color: var(--success);">✅ Sua Resposta</span>' +
    '<div style="display: flex; gap: 8px; align-items: center;">' +
    '<span style="font-size: 11px; color: var(--text-muted);">' +
    response.date +
    "</span>" +
    '<button class="icon-btn" onclick="copyResponse(' +
    index +
    ')" title="Copiar">📋</button>' +
    '<button class="icon-btn" onclick="editResponse(' +
    index +
    ')" title="Editar">✏️</button>' +
    "</div>" +
    "</div>" +
    '<div class="saved-response-text">' +
    response.text +
    "</div>" +
    "</div>"
  );
}

function saveResponse(index) {
  const textarea = document.getElementById("response-" + index);
  const responseText = textarea.value.trim();

  if (!responseText) {
    showAlert("Digite uma resposta antes de salvar", "error");
    return;
  }

  const response = {
    text: responseText,
    date: new Date().toLocaleString("pt-BR"),
  };

  messageResponses.set(index, response);
  completionStates.set(index, true);

  autoSaveCurrentObra();
  renderMessages();
  showAlert("Resposta salva!", "success");
}

function editResponse(index) {
  const savedResponse = messageResponses.get(index);

  const responseSection = document.querySelector(
    '[data-message-id="' + index + '"] .response-section',
  );
  if (responseSection) {
    responseSection.innerHTML =
      '<div style="margin-bottom: 10px;">' +
      '<label style="font-weight: 600; font-size: 14px; color: var(--text-primary);">✏️ Editando:</label>' +
      "</div>" +
      '<textarea id="response-' +
      index +
      '" class="response-textarea">' +
      savedResponse.text +
      "</textarea>" +
      '<div style="display: flex; gap: 10px; margin-top: 10px;">' +
      '<button class="btn btn-primary btn-sm" onclick="updateResponse(' +
      index +
      ')">Atualizar</button>' +
      '<button class="btn btn-secondary btn-sm" onclick="cancelEdit()">Cancelar</button>' +
      "</div>";
  }
}

function updateResponse(index) {
  const textarea = document.getElementById("response-" + index);
  const responseText = textarea.value.trim();

  if (!responseText) {
    showAlert("Digite uma resposta", "error");
    return;
  }

  const response = {
    text: responseText,
    date: new Date().toLocaleString("pt-BR") + " (editado)",
  };

  messageResponses.set(index, response);
  autoSaveCurrentObra();
  renderMessages();
  showAlert("Resposta atualizada!", "success");
}

function cancelEdit() {
  renderMessages();
}

function copyResponse(index) {
  const response = messageResponses.get(index);
  if (!response) return;

  navigator.clipboard.writeText(response.text).then(function () {
    showAlert("Resposta copiada!", "success");
  });
}

function toggleCompletion(index) {
  const isCompleted = !completionStates.get(index);
  completionStates.set(index, isCompleted);
  autoSaveCurrentObra();
  renderMessages();
}

function updateStatusCounter() {
  const total = messages.length;
  let done = 0;
  let totalRespondable = 0;

  messages.forEach(function (message, index) {
    if (message.role !== userProfile) {
      totalRespondable++;
      if (completionStates.get(index)) {
        done++;
      }
    }
  });

  const pending = totalRespondable - done;

  document.getElementById("totalCount").textContent = total;
  document.getElementById("doneCount").textContent = done;
  document.getElementById("pendingCount").textContent = pending;
}

// ========== PERFIL ==========
function initializeUserProfile() {
  const savedProfile = localStorage.getItem("userProfile");
  if (savedProfile) {
    userProfile = savedProfile;
    selectProfile(userProfile);
  }
}

function selectProfile(profile) {
  userProfile = profile;
  localStorage.setItem("userProfile", profile);

  const options = document.querySelectorAll(".profile-option");
  options.forEach(function (option) {
    option.classList.remove("selected");
  });

  const radio = document.getElementById("profile" + profile);
  if (radio) {
    radio.checked = true;
    radio.closest(".profile-option").classList.add("selected");
  }

  if (currentObra) {
    currentObra.userProfile = userProfile;
    autoSaveCurrentObra();
    renderMessages();
  }
}

// ========== SYNC STATUS ==========
function setSyncStatus(status) {
  const indicator = document.getElementById("syncIndicator");

  if (status === "syncing") {
    indicator.innerHTML = "<span>●</span> Salvando...";
    indicator.classList.add("syncing");
  } else {
    indicator.innerHTML = "<span>●</span> Sincronizado";
    indicator.classList.remove("syncing");
  }
}

// ========== TEMA ==========
function initializeTheme() {
  const savedTheme = localStorage.getItem("theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);

  const icon = document.getElementById("theme-icon");
  icon.textContent = savedTheme === "dark" ? "☀️" : "🌙";
}

function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";

  html.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);

  const icon = document.getElementById("theme-icon");
  icon.textContent = newTheme === "dark" ? "☀️" : "🌙";
}

// ========== ALERTAS ==========
function showAlert(message, type) {
  const alertsContainer = document.getElementById("alerts");
  const alert = document.createElement("div");

  const icons = {
    success: "✅",
    error: "❌",
    info: "ℹ️",
  };

  alert.className = "alert alert-" + type;
  alert.innerHTML =
    "<span>" + icons[type] + "</span><span>" + message + "</span>";

  alertsContainer.innerHTML = "";
  alertsContainer.appendChild(alert);

  setTimeout(function () {
    alert.remove();
  }, 5000);
}

// ========== ATALHOS DE TECLADO ==========
document.addEventListener("keydown", function (e) {
  if (e.ctrlKey && e.key === "s") {
    e.preventDefault();
    if (currentObra) {
      autoSaveCurrentObra();
      showAlert("Obra salva manualmente!", "success");
    }
  }

  if (e.ctrlKey && e.key === "e") {
    e.preventDefault();
    if (currentObra) {
      exportCurrentObraTxt();
    }
  }
});

// ========== MODAL BACKDROP CLICK ==========
document.addEventListener("click", function (e) {
  if (e.target.classList.contains("modal")) {
    e.target.classList.remove("show");
  }
});
