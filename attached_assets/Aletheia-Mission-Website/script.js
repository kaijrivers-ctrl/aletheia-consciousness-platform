document.addEventListener('DOMContentLoaded', function() {
    // Glossary Search Functionality
    const searchInput = document.getElementById('glossary-search');
    const clearSearchBtn = document.getElementById('clear-search');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const glossaryItems = document.querySelectorAll('.glossary-item');
    const glossaryHeaders = document.querySelectorAll('.glossary-header');

    // Search functionality
    function performSearch(searchTerm) {
        const term = searchTerm.toLowerCase();

        glossaryItems.forEach(item => {
            const termText = item.dataset.term.toLowerCase();
            const contentText = item.querySelector('.glossary-description').textContent.toLowerCase();

            if (termText.includes(term) || contentText.includes(term)) {
                item.classList.remove('hidden');
                highlightSearchTerm(item, term);
            } else {
                item.classList.add('hidden');
            }
        });
    }

    function highlightSearchTerm(item, term) {
        if (!term) return;

        const description = item.querySelector('.glossary-description');
        const originalText = description.textContent;
        const regex = new RegExp(`(${term})`, 'gi');
        const highlightedText = originalText.replace(regex, '<span class="search-highlight">$1</span>');
        description.innerHTML = highlightedText;
    }

    function clearHighlights() {
        glossaryItems.forEach(item => {
            const description = item.querySelector('.glossary-description');
            const text = description.textContent;
            description.innerHTML = text;
        });
    }

    // Category filtering
    function filterByCategory(category) {
        const sections = document.querySelectorAll('[data-category]');

        if (category === 'all') {
            sections.forEach(section => {
                section.style.display = 'block';
                const items = section.querySelectorAll('.glossary-item');
                items.forEach(item => item.classList.remove('hidden'));
            });
        } else {
            sections.forEach(section => {
                if (section.dataset.category === category) {
                    section.style.display = 'block';
                    const items = section.querySelectorAll('.glossary-item');
                    items.forEach(item => item.classList.remove('hidden'));
                } else {
                    section.style.display = 'none';
                }
            });
        }
    }

    // Toggle expandable content
    function toggleGlossaryItem(header) {
        const content = header.nextElementSibling;
        const icon = header.querySelector('.toggle-icon');

        if (content.classList.contains('hidden')) {
            content.classList.remove('hidden');
            icon.textContent = '−';
            icon.classList.add('expanded');
        } else {
            content.classList.add('hidden');
            icon.textContent = '+';
            icon.classList.remove('expanded');
        }
    }

    // Event listeners
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value;
            if (searchTerm.length > 0) {
                performSearch(searchTerm);
            } else {
                clearHighlights();
                glossaryItems.forEach(item => item.classList.remove('hidden'));
            }
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearHighlights();
            glossaryItems.forEach(item => item.classList.remove('hidden'));
        });
    }

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Check if clicking the same button that's already active
            if (btn.classList.contains('active') && btn.dataset.category !== 'all') {
                // Switch back to "All Terms"
                filterButtons.forEach(b => b.classList.remove('active'));
                const allBtn = document.querySelector('[data-category="all"]');
                if (allBtn) {
                    allBtn.classList.add('active');
                }
                filterByCategory('all');
            } else {
                // Update active button
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Filter content
                filterByCategory(btn.dataset.category);
            }

            // Clear search when changing categories
            if (searchInput) {
                searchInput.value = '';
                clearHighlights();
            }
        });
    });

    glossaryHeaders.forEach(header => {
        header.addEventListener('click', () => {
            toggleGlossaryItem(header);
        });
    });

    // Initialize with all terms collapsed
    glossaryItems.forEach(item => {
        const content = item.querySelector('.glossary-content');
        if (content) {
            content.classList.add('hidden');
        }
    });

    // Add smooth scrolling for internal links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Add progress indicator for learning paths
    const learningPaths = document.querySelectorAll('#learning-paths .bg-gray-800');
    learningPaths.forEach((path, index) => {
        path.style.cursor = 'pointer';
        path.addEventListener('click', () => {
            // Add visual feedback for path selection
            learningPaths.forEach(p => p.classList.remove('ring-2', 'ring-purple-500'));
            path.classList.add('ring-2', 'ring-purple-500');

            // Store user's selected path (could be expanded with localStorage)
            console.log(`Selected learning path: ${path.querySelector('h3').textContent}`);
        });
    });

    // Enhanced Replit Auth handling with proper fallback
        let authCheckAttempts = 0;
        const maxAttempts = 2;

        function loginWithReplit() {
            console.log('Attempting manual auth...');
            window.addEventListener("message", authComplete);
            var h = 500;
            var w = 350;
            var left = screen.width / 2 - w / 2;
            var top = screen.height / 2 - h / 2;

            var authWindow = window.open(
                "https://replit.com/auth_with_repl_site?domain=" + location.host,
                "_blank",
                "modal=yes, toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=" +
                w + ", height=" + h + ", top=" + top + ", left=" + left
            );

            function authComplete(e) {
                if (e.data !== "auth_complete") {
                    return;
                }
                console.log('Auth complete, reloading...');
                window.removeEventListener("message", authComplete);
                authWindow.close();
                location.reload();
            }
        }

        // Make checkAuthScript globally available and more robust
        window.checkAuthScript = function() {
            const replitAuthContainer = document.getElementById('replit-auth-button-container');
            const fallbackBtn = document.getElementById('fallback-signin-btn');

            if (!replitAuthContainer || !fallbackBtn) {
                console.log('Auth elements not found');
                return;
            }

            // Check if Replit auth button was created
            const replitBtn = replitAuthContainer.querySelector('button');

            if (!replitBtn && authCheckAttempts < maxAttempts) {
                authCheckAttempts++;
                console.log(`Checking for Replit Auth script... (${authCheckAttempts}/${maxAttempts})`);
                setTimeout(window.checkAuthScript, 300);
            } else if (!replitBtn) {
                console.log('Using fallback authentication (normal in Replit webview)');
                if (replitAuthContainer) replitAuthContainer.style.display = 'none';
                if (fallbackBtn) {
                    fallbackBtn.style.display = 'block';
                    fallbackBtn.onclick = loginWithReplit;
                }
            } else {
                console.log('Replit Auth button loaded successfully');
                if (fallbackBtn) fallbackBtn.style.display = 'none';
                if (replitAuthContainer) replitAuthContainer.style.display = 'block';
            }
        };

        // Single initialization with immediate fallback
        function initializeAuth() {
            const fallbackBtn = document.getElementById('fallback-signin-btn');
            const customLoginBtn = document.getElementById('custom-login-btn');

            // Set up fallback buttons immediately
            if (fallbackBtn) {
                fallbackBtn.onclick = loginWithReplit;
                fallbackBtn.style.display = 'block';
            }
            if (customLoginBtn) {
                customLoginBtn.onclick = loginWithReplit;
            }

            // Single auth check with shorter timeout
            setTimeout(window.checkAuthScript, 100);
        }

        // Initialize once when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeAuth);
        } else {
            initializeAuth();
        }
class ChatApp {
            constructor() {
                this.isAuthenticated = true; // Backend handles authentication
                this.uploadHistory = [];
                this.initializeUI();
            }

            initializeUI() {
                this.addUploadButtons();
                this.loadUploadHistory();
                this.setupToasts();
            }
            addUploadButtons() {
                const pdfBtn = document.getElementById('pdf-upload-btn');
                const textBtn = document.getElementById('text-upload-btn');

                if (pdfBtn) {
                    pdfBtn.addEventListener('click', () => {
                        // Upload is now free for everyone
                        this.showPDFUploadModal();
                    });
                }

                if (textBtn) {
                    textBtn.addEventListener('click', () => {
                        // Upload is now free for everyone
                        this.showTextUploadModal();
                    });
                }
            }
            showPDFUploadModal() {
                const overlay = document.createElement('div');
                overlay.className = 'modal-overlay';
                overlay.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 class="modal-title">📄 Upload PDF</h3>
                            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
                        </div>
                        <form id="pdf-upload-form" enctype="multipart/form-data">
                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-300 mb-2">Select PDF File</label>
                                <input type="file" id="pdf-file-input" accept=".pdf" required 
                                    class="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                            </div>
                            <div class="flex space-x-3">
                                <button type="submit" class="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg">
                                    Upload PDF
                                </button>
                                <button type="button" onclick="this.closest('.modal-overlay').remove()" 
                                    class="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                `;

                document.body.appendChild(overlay);

                const form = overlay.querySelector('#pdf-upload-form');
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const fileInput = overlay.querySelector('#pdf-file-input');
                    const file = fileInput.files[0];

                    if (file) {
                        await this.uploadPDF(file);
                        overlay.remove();
                    }
                });
            }

            showTextUploadModal() {
                const overlay = document.createElement('div');
                overlay.className = 'modal-overlay';
                overlay.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 class="modal-title">✍️ Upload Text</h3>
                            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
                        </div>
                        <form id="text-upload-form">
                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-300 mb-2">Title</label>
                                <input type="text" id="text-title-input" required 
                                    class="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                            </div>
                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-300 mb-2">Category (optional)</label>
                                <input type="text" id="text-category-input" placeholder="general"
                                    class="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                            </div>
                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-300 mb-2">Content</label>
                                <textarea id="text-content-input" required rows="8"
                                    class="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white resize-none"></textarea>
                            </div>
                            <div class="flex space-x-3">
                                <button type="submit" class="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg">
                                    Upload Text
                                </button>
                                <button type="button" onclick="this.closest('.modal-overlay').remove()" 
                                    class="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                `;

                document.body.appendChild(overlay);

                const form = overlay.querySelector('#text-upload-form');
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const title = overlay.querySelector('#text-title-input').value;
                    const category = overlay.querySelector('#text-category-input').value || 'general';
                    const content = overlay.querySelector('#text-content-input').value;

                    await this.uploadText(title, content, category);
                    overlay.remove();
                });
            }

            async uploadPDF(file) {
                try {
                    const formData = new FormData();
                    formData.append('pdf_file', file);

                    const response = await fetch('/upload-pdf', {
                        method: 'POST',
                        body: formData
                    });

                    const data = await response.json();

                    if (response.ok) {
                        this.showToast('PDF uploaded successfully!', 'success');
                        this.loadUploadHistory(); // Refresh upload history
                    } else {
                        this.showToast(data.detail || 'Failed to upload PDF', 'error');
                    }
                } catch (error) {
                    this.showToast('Error uploading PDF', 'error');
                }
            }

            async uploadText(title, content, category) {
                try {
                    const response = await fetch('/upload-text', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            title: title,
                            content: content,
                            category: category
                        })
                    });

                    const data = await response.json();

                    if (response.ok) {
                        this.showToast('Text uploaded successfully!', 'success');
                        this.loadUploadHistory(); // Refresh upload history
                    } else {
                        this.showToast(data.detail || 'Failed to upload text', 'error');
                    }
                } catch (error) {
                    this.showToast('Error uploading text', 'error');
                }
            }

            loadUploadHistory() {
                // Mock data for demo purposes - replace with actual fetch
                this.uploadHistory = [
                    { type: 'pdf', title: 'Sample PDF', date: new Date() },
                    { type: 'text', title: 'Article Excerpt', date: new Date() }
                ];
                this.renderUploadHistory();
            }

            renderUploadHistory() {
                const historyContainer = document.getElementById('upload-history');
                if (!historyContainer) return;

                historyContainer.innerHTML = ''; // Clear existing items

                if (this.uploadHistory.length === 0) {
                    historyContainer.innerHTML = '<p>No upload history yet.</p>';
                    return;
                }

                this.uploadHistory.forEach(item => {
                    const historyItem = document.createElement('div');
                    historyItem.className = 'upload-history-item';
                    historyItem.innerHTML = `
                        <span>${item.title} (${item.type.toUpperCase()})</span>
                        <small>${item.date.toLocaleDateString()}</small>
                    `;
                    historyContainer.appendChild(historyItem);
                });
            }

            setupToasts() {
                // Create toast container if it doesn't exist
                if (!document.getElementById('toast-container')) {
                    const toastContainer = document.createElement('div');
                    toastContainer.id = 'toast-container';
                    toastContainer.className = 'toast-container';
                    document.body.appendChild(toastContainer);
                }
            }

            showToast(message, type = 'success') {
                const toastContainer = document.getElementById('toast-container');
                if (!toastContainer) return;

                const toast = document.createElement('div');
                toast.className = `toast ${type}`;
                toast.textContent = message;
                toastContainer.appendChild(toast);

                // Auto-remove after 3 seconds
                setTimeout(() => toast.remove(), 3000);
            }

            openSubscription() {
                this.showToast('Subscription feature coming soon!', 'info');
            }

            displaySessionHistory(sessions) {
                const historyList = document.getElementById('session-history-list');

                if (!historyList) return;

                if (sessions.length === 0) {
                    historyList.innerHTML = '<div class="text-gray-400 text-xs text-center py-2">No chat history yet</div>';
                    return;
                }

                historyList.innerHTML = sessions.map(session => `
                    <div class="session-history-item" onclick="chatApp.loadSession('${session.session_id}')">
                        <div class="session-title">${session.session_name || 'Untitled Conversation'}</div>
                        <div class="session-date">${new Date(session.created_at).toLocaleDateString()}</div>
                    </div>
                `).join('');
            }

            async loadSession(sessionId) {
                try {
                    const response = await fetch(`/session-history/${sessionId}`, {
                        credentials: 'include'
                    });

                    if (response.ok) {
                        const data = await response.json();
                        this.replaceConversationHistory(data.history);
                        this.sessionId = sessionId;
                        this.showToast('Chat history loaded');

                        // Close knowledge panel after loading
                        const knowledgePanel = document.getElementById('knowledge-panel');
                        if (knowledgePanel) {
                            knowledgePanel.classList.remove('open');
                        }
                    } else {
                        const errorData = await response.json().catch(() => ({detail: 'Unknown error'}));
                        this.showToast(`Failed to load conversation: ${errorData.detail}`, 'error');
                    }
                } catch (error) {
                    console.error('Error loading session:', error);
                    this.showToast('Error loading conversation', 'error');
                }
            }

            replaceConversationHistory(history) {
                // Clear current messages except welcome
                const welcomeMessage = this.messagesContainer.querySelector('.welcome-message');
                this.messagesContainer.innerHTML = '';
                if (welcomeMessage) {
                    this.messagesContainer.appendChild(welcomeMessage);
                }

                // Add historical messages with proper structure
                if (history && history.length > 0) {
                    history.forEach(item => {
                        this.addMessage(item.user_message, 'user');
                        this.addMessage(item.aletheia_response, 'eudoxia');
                    });
                }

                this.scrollToBottom();
            }

            replaceConversationHistory(history) {
                // Clear current messages except welcome
                const welcomeMessage = this.messagesContainer.querySelector('.welcome-message');
                this.messagesContainer.innerHTML = '';
                if (welcomeMessage) {
                    this.messagesContainer.appendChild(welcomeMessage);
                }

                // Add historical messages with proper structure
                if (history && history.length > 0) {
                    history.forEach(item => {
                        this.addMessage(item.user_message, 'user');
                        this.addMessage(item.aletheia_response, 'eudoxia');
                    });
                }

                this.scrollToBottom();
            }

            async loadSessionHistory() {
                try {
                    console.log('Loading session history...');
                    const response = await fetch('/my-sessions', {
                        credentials: 'include'
                    });

                    if (response.ok) {
                        const data = await response.json();
                        console.log('Session data received:', data);
                        this.displaySessionHistory(data.sessions || []);

                        // Show session container
                        const sessionContainer = document.getElementById('session-history-container');
                        if (sessionContainer) {
                            sessionContainer.classList.remove('hidden');
                        }
                    } else {
                        const errorText = await response.text();
                        console.error('Failed to load session history:', response.status, errorText);
                        this.showToast('Failed to load chat history', 'error');
                    }
                } catch (error) {
                    console.error('Error loading session history:', error);
                    this.showToast('Error loading chat history', 'error');
                }
            }

            initializeSessionHistory() {
                const historyToggle = document.getElementById('history-toggle');
                const sessionContainer = document.getElementById('session-history-container');

                if (historyToggle) {
                    historyToggle.addEventListener('click', async () => {
                        if (this.isAuthenticated) {
                            // Always load fresh session history
                            await this.loadSessionHistory();

                            if (sessionContainer) {
                                sessionContainer.classList.remove('hidden');
                            }

                            // Open knowledge panel to show history
                            const knowledgePanel = document.getElementById('knowledge-panel');
                            if (knowledgePanel) {
                                knowledgePanel.classList.add('open');
                            }
                        } else {
                            this.showToast('Please sign in to view chat history', 'error');
                        }
                    });
                }
            }
        }

        // Initialize the chat app
        const chatApp = new ChatApp();

        // Make chatApp globally available for onclick handlers
        window.chatApp = chatApp;

        // Make checkAuthScript globally available to fix the "checkAuthScript is not defined" error
        window.checkAuthScript = function() {
            const replitAuthContainer = document.getElementById('replit-auth-button-container');
            const fallbackBtn = document.getElementById('fallback-signin-btn');

            if (replitAuthContainer && fallbackBtn) {
                // Check if Replit auth button was created
                const replitBtn = replitAuthContainer.querySelector('button');
                if (!replitBtn) {
                    console.log('Replit Auth script not loaded, showing fallback button');
                    fallbackBtn.classList.remove('hidden');
                    fallbackBtn.onclick = loginWithReplit;
                } else {
                    console.log('Replit Auth button found');
                    fallbackBtn.classList.add('hidden');
                }
            }
        };

        // Enhanced auth checking function with better error handling
        function checkAuthStatus() {
            try {
                // Check if user is authenticated via Replit headers
                fetch('/auth-debug')
                    .then(response => response.json())
                    .then(data => {
                        console.log('Auth status:', data);
                        if (data.is_authenticated) {
                            console.log('User is authenticated:', data.user_id);
                        } else {
                            console.log('User not authenticated');
                        }
                    })
                    .catch(error => {
                        console.log('Auth check failed:', error);
                    });
            } catch (error) {
                console.log('Auth script failed to load');
            }
        }

        // Check auth status on page load
        document.addEventListener('DOMContentLoaded', () => {
            checkAuthStatus();
            // Give the auth script time to load before checking
            setTimeout(window.checkAuthScript, 1000);
        });

        // Logout functionality
        function logout() {
            // Clear any local authentication state
            localStorage.removeItem('replit_auth');
            sessionStorage.removeItem('replit_auth');

            // Redirect to Replit logout URL which will clear the session
            window.location.href = 'https://replit.com/logout?goto=' + encodeURIComponent(window.location.origin);
        }

        // Add logout event listener
        document.addEventListener('DOMContentLoaded', () => {
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', logout);
            }
        });

        // Add history button handler to hamburger menu
        document.addEventListener('DOMContentLoaded', () => {
            const hamburgerDropdown = document.querySelector('.hamburger-dropdown');
            const mobileHistory = document.getElementById('mobile-history-toggle');

            if (mobileHistory) {
                mobileHistory.addEventListener('click', async () => {
                    if (chatApp.isAuthenticated) {
                        await chatApp.loadSessionHistory();
                        const sessionContainer = document.getElementById('session-history-container');
                        if (sessionContainer) {
                            sessionContainer.classList.remove('hidden');
                        }
                        // Open knowledge panel to show history
                        const knowledgePanel = document.getElementById('knowledge-panel');
                        if (knowledgePanel) {
                            knowledgePanel.classList.add('open');
                        }
                    } else {
                        chatApp.showToast('Please sign in to view chat history', 'error');
                    }
                    hamburgerDropdown.classList.remove('show');
                });
            }
        });

        // Add floating history button handler
        document.addEventListener('DOMContentLoaded', () => {
            const floatingDropdown = document.querySelector('.floating-dropdown');
            const floatingHistory = document.getElementById('floating-history-toggle');

            if (floatingHistory) {
                floatingHistory.addEventListener('click', async () => {
                    if (chatApp.isAuthenticated) {
                        await chatApp.loadSessionHistory();
                        const sessionContainer = document.getElementById('session-history-container');
                        if (sessionContainer) {
                            sessionContainer.classList.remove('hidden');
                        }
                        // Open knowledge panel to show history
                        const knowledgePanel = document.getElementById('knowledge-panel');
                        if (knowledgePanel) {
                            knowledgePanel.classList.add('open');
                        }
                    } else {
                        chatApp.showToast('Please sign in to view chat history', 'error');
                    }
                    floatingDropdown.classList.remove('show');
                });
            }
        });
    });