Vue.use(Buefy.default);

const maxNoInChart = 11;

const apiAddress = 'https://api.cryptovibe.io';

const colMapping = {
  'name': 'Name',
  'usersCount': 'Number of users in telegram',
  'newUsersSinceLastUpdate': 'New users in current period',
  'newUsersPercent': 'User growth in current period',
  'msgSinceLastUpdate': 'Messages in current period',
  'avgNoOfMsgPerUser': 'Avg no of messages per user in current period'
};

const app = new Vue({
    el: '#cryptovibe-app',
    data: {
        tableData: [],
        allowedSinceValues: [],
        since: 'Last 24h',
        isPaginated: false,
        isPaginationSimple: false,
        defaultSort: 'usersCount',
        defaultSortDirection: 'desc',
        currentPage: 1,
        perPage: 100,
        sortCol: 'usersCount',
        sortDirection: 'desc',
        mainChart: null,
        loadingComponent: null
    },

    methods: {
        showLoading: function() {
            this.loadingComponent = this.$loading.open();
        },
        stopShowingLoading: function() {
            if (this.loadingComponent) {
                this.loadingComponent.close();
            }
        },
        onSort: function(col, ordering) {
            this.sortCol = col;
            this.sortDirection = ordering;
            // console.log(this.defaultSort);
            this.drawChart()
        },
        getAllowedSince: function() {
            this.$http.get(`${apiAddress}/channels/stats-allowed-since-values`).then(response => {
                this.allowedSinceValues = response.body.values;
            }, response => {
            });
        },
        getStats: function() {
            this.showLoading();
            this.$http.get(`${apiAddress}/channels/stats`, { params: { since: this.since } }).then(response => {
                const cryptoData = response.body;
                cryptoData.forEach(x => {
                    // format to 2 decimal places
                    x.newUsersPercent = x.newUsersSinceLastUpdate === null ? null : Math.round((10000 * x.newUsersSinceLastUpdate) / (x.usersCount - x.newUsersSinceLastUpdate)) / 100;
                    x.avgNoOfMsgPerUser = x.msgSinceLastUpdate === null ? null : Math.round(100 * x.msgSinceLastUpdate / x.usersCount) / 100;
                });
                this.stopShowingLoading();
                this.tableData = cryptoData;
                this.drawChart()
            }, response => {
            });
        },
        drawChart: function() {
            if (this.mainChart !== null) {
                this.mainChart.destroy();
            }
            const col = this.sortCol;
            const namesWithValues = this.tableData
                .map(x => x)
                .filter(x => x[col] !== null)
                .sort((a, b) => {
                    if (this.sortDirection === 'asc')
                        return a[col] - b[col];
                    else
                        return b[col] - a[col];
                })
                .slice(0, maxNoInChart)
                .map(x => { return [x.name, x[col]] });
            const labels = namesWithValues.map(x => x[0]);
            const data = namesWithValues.map(x => x[1]);
            const ctx = document.getElementById("main-chart").getContext('2d');
            this.mainChart = new Chart(ctx, {
                type: 'horizontalBar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: colMapping[col],
                        data: data,
                        backgroundColor: 'rgb(60, 125, 230)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                }
            });
        }
    },

    beforeMount() {
        this.getAllowedSince();
        this.getStats();
    },

    watch: {
        since: function(val, oldVal) {
            if (val !== oldVal) {
                this.getStats();
            }
        }
    }
});

