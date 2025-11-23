<!DOCTYPE html>
<html lang=" es\>
<head>
 <meta charset=\UTF-8\>
 <meta name=\viewport\ content=\width=device-width initial-scale=1.0\>
 <title>Chatwoot Enterprise Multi-Tenant</title>
 <script src=\https://cdn.tailwindcss.com\></script>
 <script src=\https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js\></script>
</head>
<body class=\bg-gray-100 min-h-screen\>
 <div class=\container mx-auto py-8 px-4\>
 <div class=\max-w-4xl mx-auto\>
 <div class=\bg-white rounded-lg shadow-lg p-6 mb-6\>
 <h1 class=\text-3xl font-bold text-gray-900 mb-4\> Chatwoot Enterprise Multi-Tenant</h1>
 
 <!-- Configuration Status -->
 <div id=\configStatus\ class=\mb-6\>
 <h2 class=\text-xl font-semibold mb-3\>Estado de Configuración</h2>
 <div class=\bg-gray-50 p-4 rounded-lg\>
 <p class=\text-gray-600\>Cargando configuración...</p>
 </div>
 </div>

 <!-- Auto-Provisioning Section -->
 <div class=\mb-6\>
 <h2 class=\text-xl font-semibold mb-3\>Auto-Provisioning</h2>
 <div class=\flex gap-4\>
 <button id=\provisionBtn\ 
 class=\bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50\>
 Provisionar Cuenta Chatwoot
 </button>
 <button id=\checkStatusBtn\ 
 class=\bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg\>
 Verificar Estado
 </button>
 </div>
 </div>

 <!-- Agent Invitation Section -->
 <div class=\mb-6\>
 <h2 class=\text-xl font-semibold mb-3\>Invitar Agente</h2>
 <div class=\grid grid-cols-1 md:grid-cols-3 gap-4 mb-4\>
 <input id=\agentEmail\ type=\email\ placeholder=\Email del agente\ 
 class=\border border-gray-300 rounded-lg px-3 py-2\>
 <input id=\agentName\ type=\text\ placeholder=\Nombre del agente\
 class=\border border-gray-300 rounded-lg px-3 py-2\>
 <select id=\agentRole\ class=\border border-gray-300 rounded-lg px-3 py-2\>
 <option value=\agent\>Agente</option>
 <option value=\administrator\>Administrador</option>
 </select>
 </div>
 <button id=\inviteBtn\ 
 class=\bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg disabled:opacity-50\>
 Enviar Invitación
 </button>
 </div>

 <!-- Dashboard Preview -->
 <div class=\mb-6\>
 <h2 class=\text-xl font-semibold mb-3\>Dashboard Enterprise</h2>
 <div id=\dashboard\ class=\bg-gray-50 p-4 rounded-lg\>
 <p class=\text-gray-600\>Dashboard no disponible</p>
 </div>
 </div>

 <!-- Results -->
 <div id=\results\ class=\hidden mb-6\>
 <h2 class=\text-xl font-semibold mb-3\>Resultados</h2>
 <div id=\resultsContent\ class=\bg-gray-50 p-4 rounded-lg\>
 </div>
 </div>
 </div>
 </div>
 </div>

 <script>
 // Configuration check
 async function checkConfiguration() {
 try {
 const response = await axios.get('/chatwoot/enterprise/configuration');
 const config = response.data.configuration;
 
 document.getElementById('configStatus').innerHTML = \
 <h2 class=\text-xl font-semibold mb-3\>Estado de Configuración</h2>
 <div class=\ border p-4 rounded-lg\>
 <div class=\flex items-center gap-2 mb-2\>
 <span class=\\\>
 \
 </span>
 <strong>\</strong>
 </div>
 <p><strong>Empresa:</strong> \</p>
 <p><strong>Account ID:</strong> \</p>
 <p><strong>API Key:</strong> \</p>
 <p><strong>Widget:</strong> \</p>
 </div>
 \;
 
 // Enable/disable provision button
 document.getElementById('provisionBtn').disabled = config.is_provisioned;
 
 if (config.is_provisioned) {
 loadDashboard();
 }
 } catch (error) {
 document.getElementById('configStatus').innerHTML = \
 <h2 class=\text-xl font-semibold mb-3\>Estado de Configuración</h2>
 <div class=\bg-red-50 border-red-200 border p-4 rounded-lg\>
 <p class=\text-red-600\> Error al cargar configuración: \</p>
 </div>
 \;
 }
 }

 // Auto-provisioning
 async function provisionAccount() {
 const btn = document.getElementById('provisionBtn');
 btn.disabled = true;
 btn.textContent = 'Provisionando...';
 
 try {
 const response = await axios.post('/chatwoot/enterprise/provision');
 showResults(' Cuenta provisionada exitosamente', response.data, 'success');
 setTimeout(() => checkConfiguration(), 1000);
 } catch (error) {
 showResults(' Error al provisionar cuenta', error.response?.data || error.message, 'error');
 } finally {
 btn.disabled = false;
 btn.textContent = 'Provisionar Cuenta Chatwoot';
 }
 }

 // Invite agent
 async function inviteAgent() {
 const email = document.getElementById('agentEmail').value;
 const name = document.getElementById('agentName').value;
 const role = document.getElementById('agentRole').value;
 
 if (!email || !name) {
 alert('Por favor completa email y nombre del agente');
 return;
 }
 
 const btn = document.getElementById('inviteBtn');
 btn.disabled = true;
 btn.textContent = 'Enviando...';
 
 try {
 const response = await axios.post('/chatwoot/enterprise/invite-agent', {
 email, name, role
 });
 showResults(' Invitación enviada exitosamente', response.data, 'success');
 // Clear form
 document.getElementById('agentEmail').value = '';
 document.getElementById('agentName').value = '';
 } catch (error) {
 showResults(' Error al enviar invitación', error.response?.data || error.message, 'error');
 } finally {
 btn.disabled = false;
 btn.textContent = 'Enviar Invitación';
 }
 }

 // Load dashboard
 async function loadDashboard() {
 try {
 const response = await axios.get('/chatwoot/enterprise/dashboard');
 const dashboard = response.data.dashboard;
 
 document.getElementById('dashboard').innerHTML = \
 <div class=\grid grid-cols-2 md:grid-cols-4 gap-4\>
 <div class=\bg-blue-100 p-4 rounded-lg text-center\>
 <div class=\text-2xl font-bold text-blue-600\>\</div>
 <div class=\text-sm text-blue-600\>Conversaciones</div>
 </div>
 <div class=\bg-green-100 p-4 rounded-lg text-center\>
 <div class=\text-2xl font-bold text-green-600\>\</div>
 <div class=\text-sm text-green-600\>Contactos</div>
 </div>
 <div class=\bg-purple-100 p-4 rounded-lg text-center\>
 <div class=\text-2xl font-bold text-purple-600\>\</div>
 <div class=\text-sm text-purple-600\>Agentes</div>
 </div>
 <div class=\bg-yellow-100 p-4 rounded-lg text-center\>
 <div class=\text-2xl font-bold text-yellow-600\>\</div>
 <div class=\text-sm text-yellow-600\>Abiertas</div>
 </div>
 </div>
 <div class=\mt-4 text-sm text-gray-600\>
 <p><strong>Company ID:</strong> \</p>
 <p><strong>Chatwoot Account:</strong> \</p>
 </div>
 \;
 } catch (error) {
 document.getElementById('dashboard').innerHTML = \
 <p class=\text-red-600\> Error al cargar dashboard: \</p>
 \;
 }
 }

 // Show results
 function showResults(title, data, type) {
 const resultsDiv = document.getElementById('results');
 const contentDiv = document.getElementById('resultsContent');
 
 resultsDiv.classList.remove('hidden');
 
 const bgColor = type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
 
 contentDiv.innerHTML = \
 <div class=\ border p-4 rounded-lg\>
 <h3 class=\font-semibold mb-2\>\</h3>
 <pre class=\text-sm overflow-auto\>\</pre>
 </div>
 \;
 }

 // Event listeners
 document.getElementById('provisionBtn').addEventListener('click', provisionAccount);
 document.getElementById('checkStatusBtn').addEventListener('click', checkConfiguration);
 document.getElementById('inviteBtn').addEventListener('click', inviteAgent);

 // Initial load
 checkConfiguration();
 </script>
</body>
</html>
