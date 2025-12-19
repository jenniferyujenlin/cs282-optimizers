// Global data storage
let projectsData = [];
let filteredData = [];

// Load data when page loads
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    populateHomeworkFilter();
    generateMatrix();
    populateTable(projectsData);
});

// Load data from JSON file
async function loadData() {
    try {
        const response = await fetch('data/data.json');
        if (!response.ok) {
            throw new Error('Failed to load data');
        }
        const data = await response.json();
        projectsData = data.submissions || [];
        filteredData = projectsData;
        console.log('Loaded projects:', projectsData.length);
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('projects-tbody').innerHTML = 
            '<tr><td colspan="7" class="error">Error loading project data. Please ensure data/data.json exists.</td></tr>';
    }
}

// Generate the overview matrix (HW × Optimizer Categories)
function generateMatrix() {
    const container = document.getElementById('matrix-container');
    
    // Define optimizer categories (based on professor's list)
    const optimizerCategories = [
        'Muon',
        'SOAP',
        'Lion',
        'LR with batchsize',
        'Muon variants',
        'MuP',
        'Memory-efficient optimizers'
    ];
    
    // Get unique homeworks and sort
    const homeworks = [...new Set(projectsData.map(p => p.hw))].sort((a, b) => a - b);
    
    // Create matrix mapping: hw -> category -> [projects]
    const matrix = {};
    homeworks.forEach(hw => {
        matrix[hw] = {};
        optimizerCategories.forEach(cat => {
            matrix[hw][cat] = [];
        });
    });
    
    // Categorize each project
    projectsData.forEach(project => {
        const hw = project.hw;
        let categories = [];
        
        // Check if project has 'optimizer' field in JSON
        if (project.optimizer && Array.isArray(project.optimizer)) {
            // Use the optimizer field from JSON
            categories = project.optimizer;
        } else if (project.optimizer && typeof project.optimizer === 'string') {
            // Handle single optimizer as string
            categories = [project.optimizer];
        } else {
            // Fallback: detect from title and summary
            const text = `${project.title} ${project.summary}`.toLowerCase();
            
            if (/\bmuon\b(?!lion|adamw|variant)/i.test(text) && !/adamuon|limuon/i.test(text)) {
                categories.push('Muon');
            }
            if (/soap/i.test(text)) {
                categories.push('SOAP');
            }
            if (/\blion\b/i.test(text) && !/muonlion/i.test(text)) {
                categories.push('Lion');
            }
            if (/learning rate.*batch|batch.*learning rate|lr.*batch|batch size.*scaling/i.test(text)) {
                categories.push('LR with batchsize');
            }
            if (/adamuon|limuon|muon variant|muonlion|muonadamw|polar express|manifold muon/i.test(text)) {
                categories.push('Muon variants');
            }
            if (/\bmup\b|µp/i.test(text)) {
                categories.push('MuP');
            }
            if (/shampoo|adafactor/i.test(text)) {
                categories.push('Memory-efficient optimizers');
            }
        }
        
        // Add project to appropriate categories
        if (categories.length === 0) {
            categories.push('Other');
        }
        
        categories.forEach(cat => {
            if (matrix[hw] && matrix[hw][cat]) {
                matrix[hw][cat].push(project);
            } else if (matrix[hw]) {
                // Category exists but not initialized
                console.warn(`Category "${cat}" not in predefined list for project ${project.ed_id}`);
            }
        });
    });
    
    // Generate HTML table
    let html = '<div class="matrix-scroll"><table class="matrix-table"><thead><tr><th>HW</th>';
    
    optimizerCategories.forEach(cat => {
        html += `<th>${cat}</th>`;
    });
    
    html += '</tr></thead><tbody>';
    
    homeworks.forEach(hw => {
        html += `<tr><td class="hw-cell"><strong>HW${hw}</strong></td>`;
        
        optimizerCategories.forEach(cat => {
            const projects = matrix[hw][cat];
            
            if (projects.length > 0) {
                html += '<td class="matrix-cell-with-content">';
                projects.forEach((project, idx) => {
                    html += `<a href="project.html?id=${project.ed_id}" class="matrix-project-link">
                        ${truncate(project.title, 50)}
                    </a>`;
                    if (idx < projects.length - 1) {
                        html += '<br><br>';
                    }
                });
                html += '</td>';
            } else {
                html += '<td class="matrix-cell-empty">—</td>';
            }
        });
        
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// Filter projects by homework
function filterByHomework(hw) {
    const filtered = projectsData.filter(p => p.hw === hw);
    populateTable(filtered);
    
    // Show filter message
    const resultsDiv = document.getElementById('search-results');
    resultsDiv.className = 'show';
    resultsDiv.innerHTML = `Showing ${filtered.length} project${filtered.length !== 1 ? 's' : ''} for HW${hw}`;
    
    // Scroll to table
    document.getElementById('projects-section').scrollIntoView({ behavior: 'smooth' });
}

// Populate the full projects table
function populateTable(data) {
    const tbody = document.getElementById('projects-tbody');
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No projects found</td></tr>';
        return;
    }
    
    let html = '';
    data.forEach(project => {
        html += `<tr>
            <td>${project.ed_id}</td>
            <td>${project.student_name || 'N/A'}</td>
            <td>HW${project.hw}</td>
            <td>${truncate(project.title || '', 60)}</td>
            <td>${truncate(project.summary || '', 100)}</td>
            <td>${generateFileLinks(project)}</td>
            <td>
                <a href="project.html?id=${project.ed_id}" class="view-details-btn">View Details</a>
            </td>
        </tr>`;
    });
    
    tbody.innerHTML = html;
}

// Generate file download links
function generateFileLinks(project) {
    const files = project.files || [];
    const images = project.images || [];
    
    if (files.length === 0 && images.length === 0) {
        return 'N/A';
    }
    
    let html = '';
    
    // Add file links
    files.forEach(file => {
        const icon = getFileIcon(file.type);
        const url = file.url || '';
        
        // Handle multiple URLs in one field (comma-separated)
        const urls = url.split(',').map(u => u.trim());
        
        urls.forEach((singleUrl, idx) => {
            const linkText = urls.length > 1 ? `${file.name} (${idx + 1})` : file.name;
            html += `<a href="data/${singleUrl}" class="file-link" target="_blank">${icon} ${linkText}</a> `;
        });
    });
    
    // Add image links
    images.forEach(img => {
        html += `<a href="data/${img.url}" class="file-link" target="_blank">🖼️ ${img.name}</a> `;
    });
    
    return html;
}

// Get icon based on file type
function getFileIcon(type) {
    const icons = {
        'pdf': '📄',
        'ipynb': '📓',
        'zip': '📦',
        'colab': '🔗',
        'gdrive': '📁',
        'png': '🖼️',
        'jpg': '🖼️',
        'jpeg': '🖼️'
    };
    return icons[type] || '📎';
}

// Truncate text with ellipsis
function truncate(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Search functionality
function searchProjects() {
    const searchField = document.getElementById('search-field').value;
    const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
    
    if (!searchTerm) {
        alert('Please enter a search term');
        return;
    }
    
    let results = [];
    
    if (searchField === 'all') {
        // Search across all fields
        results = projectsData.filter(project => {
            return Object.values(project).some(value => {
                if (value === null || value === undefined) return false;
                return String(value).toLowerCase().includes(searchTerm);
            });
        });
    } else {
        // Search specific field
        results = projectsData.filter(project => {
            const value = project[searchField];
            if (value === null || value === undefined) return false;
            return String(value).toLowerCase().includes(searchTerm);
        });
    }
    
    filteredData = results;
    populateTable(results);
    
    // Show search results summary with list of matching projects
    const resultsDiv = document.getElementById('search-results');
    resultsDiv.className = 'show';
    
    let resultsHtml = `<h3>Found ${results.length} project${results.length !== 1 ? 's' : ''} matching "${searchTerm}"</h3>`;
    
    if (results.length > 0) {
        resultsHtml += '<ul class="search-results-list">';
        results.forEach(project => {
            resultsHtml += `
                <li>
                    <a href="project.html?id=${project.ed_id}" class="search-result-link">
                        <strong>HW${project.hw} - Ed ID ${project.ed_id} - ${project.student_name || 'Unknown'}</strong>
                        <br>
                        <span class="result-title">${truncate(project.title, 80)}</span>
                    </a>
                </li>
            `;
        });
        resultsHtml += '</ul>';
    }
    
    resultsDiv.innerHTML = resultsHtml;
    
    // Scroll to results
    resultsDiv.scrollIntoView({ behavior: 'smooth' });
}

// Clear search and show all projects
function clearSearch() {
    document.getElementById('search-input').value = '';
    document.getElementById('search-field').value = 'all';
    filteredData = projectsData;
    populateTable(projectsData);
    
    const resultsDiv = document.getElementById('search-results');
    resultsDiv.className = '';
}

// Populate homework filter dropdown
function populateHomeworkFilter() {
    const hwFilter = document.getElementById('hw-filter');
    const homeworks = [...new Set(projectsData.map(p => p.hw))].sort((a, b) => a - b);
    
    // Clear existing options except "All Homeworks"
    hwFilter.innerHTML = '<option value="all">All Homeworks</option>';
    
    // Add homework options
    homeworks.forEach(hw => {
        const option = document.createElement('option');
        option.value = hw;
        option.textContent = `HW${hw}`;
        hwFilter.appendChild(option);
    });
}

// Filter table by homework
function filterTableByHomework() {
    const hwFilter = document.getElementById('hw-filter');
    const selectedHw = hwFilter.value;
    
    if (selectedHw === 'all') {
        filteredData = projectsData;
        populateTable(projectsData);
    } else {
        const filtered = projectsData.filter(p => p.hw === parseInt(selectedHw));
        filteredData = filtered;
        populateTable(filtered);
    }
}

// Clear table filter
function clearTableFilter() {
    document.getElementById('hw-filter').value = 'all';
    filteredData = projectsData;
    populateTable(projectsData);
}

// Handle enter key in search input
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchProjects();
            }
        });
    }
});
