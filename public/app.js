const app = {
    // Current Price State
    currentPrice: { eur: 0, usd: 0 },
    currentCurrency: 'eur', // 'eur' or 'usd'

    // Chart State
    chartMode: 'monthly', // 'monthly' or 'daily'

    chartMonth: null, // 'YYYY-MM' when in daily mode
    allThawEvents: [],


    init() {
        this.cacheDOM();
        this.bindEvents();
        this.loadWatchlist();
    },

    cacheDOM() {
        this.input = document.getElementById('address-input');
        this.nameInput = document.getElementById('name-input');
        this.lookupBtn = document.getElementById('lookup-btn');
        this.addBtn = document.getElementById('add-btn');
        this.lookupResult = document.getElementById('lookup-result');
        this.watchlistContainer = document.getElementById('watchlist-container');

        // Hero Stats
        this.globalTotalEl = document.getElementById('global-total-allocation');
        this.globalUnlockedEl = document.getElementById('global-unlocked');
        this.globalRedeemedEl = document.getElementById('global-redeemed');
        this.globalLockedEl = document.getElementById('global-locked');
        this.globalNextEl = document.getElementById('global-next-unlock');

        this.walletCountEl = document.getElementById('wallet-count');
        this.chartCanvas = document.getElementById('unlocksChart');
        this.chartBackBtn = document.getElementById('chart-back-btn');


        // Tooltip
        this.unlockedSubstat = document.getElementById('unlocked-substat');
        this.unlockedTooltip = document.getElementById('unlocked-tooltip');

        // Price
        this.priceDisplay = document.getElementById('price-display');
        this.tokenPriceEl = document.getElementById('token-price');
        this.priceChangeEl = document.getElementById('price-change');
        this.currencyToggleBtn = document.getElementById('currency-toggle');
    },


    bindEvents() {
        this.lookupBtn.addEventListener('click', () => this.handleLookup());
        this.addBtn.addEventListener('click', () => this.addToWatchlistFromInput());

        if (this.currencyToggleBtn) {
            this.currencyToggleBtn.addEventListener('click', () => this.toggleCurrency());
        }

        if (this.chartBackBtn) {

            this.chartBackBtn.addEventListener('click', () => {
                this.chartMode = 'monthly';
                this.chartMonth = null;
                this.renderChart(this.allThawEvents);
            });
        }


        // Enter key support
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLookup();
        });

        // Tooltip hover
        if (this.unlockedSubstat && this.unlockedTooltip) {
            this.unlockedSubstat.addEventListener('mouseenter', () => {
                this.unlockedTooltip.classList.remove('hidden');
            });
            this.unlockedSubstat.addEventListener('mouseleave', () => {
                this.unlockedTooltip.classList.add('hidden');
            });
        }
    },

    async handleLookup() {
        const address = this.input.value.trim();
        if (!address) return;

        this.lookupResult.classList.remove('hidden');
        this.lookupResult.innerHTML = '<div class="glass-panel" style="padding: 2rem; text-align: center;">Loading...</div>';

        try {
            const res = await fetch(`/api/lookup?address=${address}`);
            const data = await res.json();

            if (data.error) throw new Error(data.error);

            this.lookupResult.innerHTML = ''; // Clear loading
            this.renderWalletCard(data, address, '', this.lookupResult, false);
        } catch (error) {
            this.lookupResult.innerHTML = `
                <div class="glass-panel" style="padding: 1.5rem; border-color: rgba(239, 68, 68, 0.3);">
                    <p style="color: #ef4444; margin: 0;"><i class="fa-solid fa-triangle-exclamation"></i> Error: ${error.message}</p>
                </div>`;
        }
    },

    async addToWatchlistFromInput() {
        const address = this.input.value.trim();
        const name = this.nameInput.value.trim();
        if (!address) return;

        try {
            const res = await fetch('/api/wallets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address, name })
            });
            await res.json();
            this.input.value = '';
            this.nameInput.value = '';
            this.loadWatchlist();

            // Provide visual feedback
            const btnIcon = this.addBtn.innerHTML;
            this.addBtn.innerHTML = '<i class="fa-solid fa-check" style="color: var(--success)"></i>';
            setTimeout(() => this.addBtn.innerHTML = btnIcon, 2000);

        } catch (error) {
            console.error(error);
        }
    },

    async removeFromWatchlist(address) {
        if (!confirm('Remove this wallet from monitoring?')) return;

        try {
            await fetch('/api/wallets', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address })
            });
            this.loadWatchlist();
        } catch (error) {
            console.error(error);
        }
    },

    async loadWatchlist() {
        this.watchlistContainer.innerHTML = '<p class="glass-panel" style="padding:1rem">Loading monitored wallets...</p>';
        await this.fetchPrice(); // Ensure price is loaded first for rendering

        try {
            const res = await fetch('/api/wallets');
            const wallets = await res.json();

            this.watchlistContainer.innerHTML = '';

            let gTotal = 0;
            let gUnlocked = 0; // Tracks Redeemable
            let gRedeemed = 0;

            let gLocked = 0;
            let count = 0;
            let allNextThaws = [];
            let allThawEvents = [];
            let tooltipHtml = '';

            wallets.forEach(wallet => {
                count++;
                if (wallet.status === 'success') {
                    const stats = this.calculateStats(wallet.data.thaws || []);
                    gTotal += stats.total;
                    gUnlocked += stats.redeemable; // Note: gUnlocked logic now tracks redeemable
                    gRedeemed += stats.redeemed;
                    gLocked += stats.locked;

                    if (stats.nextThawDate) {
                        allNextThaws.push(stats.nextThawDate);
                    }


                    // Collect all events for chart
                    (wallet.data.thaws || []).forEach(t => allThawEvents.push(t));

                    // Build tooltip row
                    const fmt = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

                    if (stats.redeemable > 0) {

                        const displayName = wallet.name ? wallet.name : `${wallet.address.substr(0, 8)}...`;
                        tooltipHtml += `
                            <div class="tooltip-row">
                                <span>${displayName}</span>
                                <span class="success-text" style="margin-left:1rem;">${fmt(stats.redeemable)} ${this.formatEur(stats.redeemable)}</span>

                            </div>
                        `;
                    }

                    this.renderWalletCard(wallet.data, wallet.address, wallet.name, this.watchlistContainer, true);
                } else {
                    this.renderErrorCard(wallet.address, wallet.error);
                }
            });

            // Find global earliest next thaw
            const globalNext = allNextThaws.length > 0 ? new Date(Math.min(...allNextThaws)) : null;

            this.updateGlobalStats(gTotal, gUnlocked, gRedeemed, gLocked, count, globalNext);

            // Store events for chart interactivity
            this.allThawEvents = allThawEvents;
            this.renderChart(this.allThawEvents);


            // Update tooltip content
            if (this.unlockedTooltip) {
                this.unlockedTooltip.innerHTML = tooltipHtml || '<div style="text-align:center; color: var(--text-muted);">No data</div>';
            }

        } catch (error) {
            this.watchlistContainer.innerHTML = `<p>Error loading watchlist: ${error.message}</p>`;
        }
    },

    async fetchPrice() {
        try {
            const res = await fetch('/api/price');
            const data = await res.json();

            if (data) {
                this.currentPrice = {
                    eur: data.eur || 0,
                    usd: data.usd || 0
                };
                this.currentChanges = {
                    eur: data.eur_24h_change || 0,
                    usd: data.usd_24h_change || 0
                };

                this.updatePriceDisplay();
            }
        } catch (error) {
            console.error("Price fetch failed", error);
        }
    },

    toggleCurrency() {
        this.currentCurrency = this.currentCurrency === 'eur' ? 'usd' : 'eur';
        this.updatePriceDisplay();
        this.loadWatchlist(); // Refresh all values
    },

    updatePriceDisplay() {
        if (!this.priceDisplay) return;

        const rate = this.currentPrice[this.currentCurrency];
        const change = this.currentChanges ? this.currentChanges[this.currentCurrency] : 0;
        const symbol = this.currentCurrency === 'eur' ? '€' : '$';
        const name = this.currentCurrency === 'eur' ? 'EUR' : 'USD';

        this.priceDisplay.classList.remove('hidden');
        this.tokenPriceEl.textContent = `${symbol}${rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;

        const icon = change >= 0 ? '<i class="fa-solid fa-arrow-up"></i>' : '<i class="fa-solid fa-arrow-down"></i>';
        const color = change >= 0 ? 'var(--success)' : '#ef4444';

        this.priceChangeEl.innerHTML = `${icon} ${Math.abs(change).toFixed(2)}%`;
        this.priceChangeEl.style.color = color;

        if (this.currencyToggleBtn) this.currencyToggleBtn.textContent = name;
    },


    calculateStats(schedule) {
        const today = new Date();
        let total = 0;
        let redeemable = 0;
        let redeemed = 0;
        let nextThawDate = null;

        schedule.forEach(item => {
            const amount = parseFloat(item.amount) / 1000000;
            total += amount;
            const date = new Date(item.thawing_period_start);

            if (item.transaction_id) {
                redeemed += amount;
            } else if (date <= today) {
                redeemable += amount;
            } else {
                if (!nextThawDate || date < nextThawDate) {
                    nextThawDate = date;
                }
            }
        });

        return {
            total,
            redeemable,
            redeemed,
            locked: total - redeemable - redeemed,
            nextThawDate
        };
    },


    formatEur(amount) {
        const rate = this.currentPrice[this.currentCurrency];
        if (!rate) return '';
        const value = amount * rate;
        const symbol = this.currentCurrency === 'eur' ? '€' : '$';
        return ` <span style="font-size: 0.8em; opacity: 0.7; font-weight: 400;">(${symbol}${value.toLocaleString(undefined, { maximumFractionDigits: 0 })})</span>`;
    },


    updateGlobalStats(total, redeemable, redeemed, locked, count, nextDate) {
        const fmt = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        // Animate numbers (simple implementation)
        this.globalTotalEl.innerHTML = `${fmt(total)} NIGHT ${this.formatEur(total)}`;
        this.globalUnlockedEl.innerHTML = `${fmt(redeemable)} NIGHT ${this.formatEur(redeemable)}`;
        if (this.globalRedeemedEl) this.globalRedeemedEl.innerHTML = `${fmt(redeemed)} NIGHT ${this.formatEur(redeemed)}`;
        this.globalLockedEl.innerHTML = `${fmt(locked)} NIGHT ${this.formatEur(locked)}`;

        this.walletCountEl.textContent = count;

        if (nextDate) {
            const today = new Date();
            const daysLeft = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));
            this.globalNextEl.textContent = `${daysLeft} days (${nextDate.toLocaleDateString()})`;
        } else {
            this.globalNextEl.textContent = "None";
        }
    },

    renderChart(events) {
        if (!this.chartCanvas) return;

        let labels = [];
        let values = [];
        let labelText = 'Monthly Unlocks (NIGHT)';

        if (this.chartMode === 'monthly') {
            // Aggregate amounts by month
            const monthlyData = {};
            events.forEach(e => {
                const date = new Date(e.thawing_period_start);
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const amount = parseFloat(e.amount) / 1000000;
                monthlyData[key] = (monthlyData[key] || 0) + amount;
            });

            const sortedKeys = Object.keys(monthlyData).sort();
            labels = sortedKeys.map(k => {
                const [y, m] = k.split('-');
                return new Date(y, m - 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
            });
            values = sortedKeys.map(k => monthlyData[k]);

            // Hide back button
            if (this.chartBackBtn) this.chartBackBtn.classList.add('hidden');

        } else if (this.chartMode === 'daily' && this.chartMonth) {
            // Aggregate amounts by day for the selected month
            labelText = `Daily Unlocks for ${new Date(this.chartMonth + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })} (NIGHT)`;

            const dailyData = {};
            const [targetYear, targetMonth] = this.chartMonth.split('-').map(Number);

            // Initialize all days in month with 0 (optional, but cleaner graph)
            const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
            for (let i = 1; i <= daysInMonth; i++) {
                const key = `${this.chartMonth}-${String(i).padStart(2, '0')}`;
                dailyData[key] = 0;
            }

            events.forEach(e => {
                const date = new Date(e.thawing_period_start);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

                if (monthKey === this.chartMonth) {
                    const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    const amount = parseFloat(e.amount) / 1000000;
                    dailyData[dayKey] = (dailyData[dayKey] || 0) + amount;
                }
            });

            const sortedKeys = Object.keys(dailyData).sort();
            labels = sortedKeys.map(k => {
                const [y, m, d] = k.split('-');
                return `${d} ${new Date(y, m - 1).toLocaleDateString(undefined, { month: 'short' })}`;
            });
            values = sortedKeys.map(k => dailyData[k]);

            // Show back button
            if (this.chartBackBtn) this.chartBackBtn.classList.remove('hidden');
        }

        // Destroy old chart if exists
        if (this.chartInstance) this.chartInstance.destroy();

        this.chartInstance = new Chart(this.chartCanvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: labelText,
                    data: values,
                    backgroundColor: 'rgba(129, 140, 248, 0.5)', // Primary color opacity
                    borderColor: '#818cf8',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onClick: (event, elements) => {
                    if (this.chartMode === 'monthly' && elements.length > 0) {
                        const index = elements[0].index;
                        // Reconstruct key from data (assumes sorted order matches)
                        // We need key to filter. 
                        // To be safe, let's regenerate the keys array logic here or store it.
                        // Simple way: re-derive sortedKeys from monthlyData logic locally or just accept we need to store it.
                        // BUT: we didn't store monthlyData keys in a class property.
                        // Hack: The label string is formatted "Oct 2025". We can parse it, or better yet, since we are in the same function scope? No, onClick is async callback.
                        // Let's store the keys in the chart instance or app state?
                        // Better: regenerate keys logic is minimal cost.

                        const monthlyData = {};
                        this.allThawEvents.forEach(e => {
                            const date = new Date(e.thawing_period_start);
                            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                            const amount = parseFloat(e.amount) / 1000000;
                            monthlyData[key] = (monthlyData[key] || 0) + amount;
                        });
                        const sortedKeys = Object.keys(monthlyData).sort();
                        const selectedMonthKey = sortedKeys[index];

                        if (selectedMonthKey) {
                            this.chartMode = 'daily';
                            this.chartMonth = selectedMonthKey;
                            this.renderChart(this.allThawEvents);
                        }
                    }
                },
                onHover: (event, elements) => {
                    event.native.target.style.cursor = elements.length ? 'pointer' : 'default';
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleColor: '#e2e8f0',
                        bodyColor: '#e2e8f0',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8' }
                    }
                }
            }
        });
    },


    renderWalletCard(data, address, name, container, isWatchlist) {
        const schedule = data.thaws || [];
        const stats = this.calculateStats(schedule);
        const percentRedeemable = stats.total > 0 ? (stats.redeemable / stats.total) * 100 : 0;
        const percentRedeemed = stats.total > 0 ? (stats.redeemed / stats.total) * 100 : 0;


        // Find next thaw
        const today = new Date();
        const nextThaw = schedule.find(s => new Date(s.thawing_period_start) > today);
        let nextThawHtml = '';

        if (nextThaw) {
            const date = new Date(nextThaw.thawing_period_start).toLocaleDateString();
            const daysLeft = Math.ceil((new Date(nextThaw.thawing_period_start) - today) / (1000 * 60 * 60 * 24));
            const amount = parseFloat(nextThaw.amount) / 1000000;

            nextThawHtml = `
                <div class="next-thaw-badge">
                    <i class="fa-regular fa-clock"></i>
                    <span>Next: <strong>${amount.toFixed(0)}</strong> in ${daysLeft} days (${date})</span>
                </div>
            `;
        } else {
            nextThawHtml = `
                <div class="next-thaw-badge" style="background: rgba(16, 185, 129, 0.1); color: var(--success)">
                    <i class="fa-solid fa-check-circle"></i>
                    <span>All tokens unlocked</span>
                </div>
            `;
        }

        const card = document.createElement('div');
        card.className = isWatchlist ? 'wallet-card' : 'wallet-card glass-panel';
        if (!isWatchlist) card.style.marginBottom = '2rem';

        const fmt = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        let headerContent = '';
        if (name) {
            headerContent = `<div style="display:flex; flex-direction:column; gap:0.25rem;">
                                <strong style="font-size:1.1rem; color:white;">${name}</strong>
                                <div class="wallet-address" title="${address}" style="font-size:0.75rem;">${address}</div>
                             </div>`;
        } else {
            headerContent = `<div class="wallet-address" title="${address}">${address}</div>`;
        }

        card.innerHTML = `
            <div class="wallet-header">
                ${headerContent}
                ${isWatchlist ? `<button class="delete-btn" onclick="app.removeFromWatchlist('${address}')"><i class="fa-solid fa-xmark"></i></button>` : ''}
            </div>
            
            <div class="balance-row">
                <span class="balance-label">Total Allocation</span>
                <span class="balance-value">${fmt(stats.total)} <span style="font-size: 0.6em; opacity: 0.7; font-weight: 400;">${this.formatEur(stats.total)}</span></span>
            </div>

            <div class="progress-bar-container" style="display: flex;">
                <div class="progress-bar" style="width: ${percentRedeemed}%; background: var(--primary); border-radius: 3px 0 0 3px;" title="${percentRedeemed.toFixed(1)}% Redeemed"></div>
                <div class="progress-bar" style="width: ${percentRedeemable}%; background: var(--success); border-radius: 0 3px 3px 0;" title="${percentRedeemable.toFixed(1)}% Redeemable"></div>
            </div>

            
            <div class="progress-label">
                <span class="success-text" title="Redeemable">${fmt(stats.redeemable)} Unlocked</span>
                <span class="redeemed-text" title="Redeemed">${fmt(stats.redeemed)} Redeemed</span>
                <span class="muted-text">${fmt(stats.locked)} Locked</span>
            </div>


            ${nextThawHtml}
        `;

        container.appendChild(card);
    },

    renderErrorCard(address, error) {
        const card = document.createElement('div');
        card.className = 'wallet-card';
        card.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        card.innerHTML = `
            <div class="wallet-header">
                <div class="wallet-address">${address}</div>
                <button class="delete-btn" onclick="app.removeFromWatchlist('${address}')"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div style="color: #ef4444; font-size: 0.9rem;">
                <i class="fa-solid fa-circle-exclamation"></i> ${error}
            </div>
        `;
        this.watchlistContainer.appendChild(card);
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
