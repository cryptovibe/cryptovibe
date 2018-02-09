Vue.use(Buefy.default);

const maxNoInChart = 12;

const apiAddress = 'https://api.cryptovibe.io';

const chartColor = 'rgb(60, 125, 230)';

const colMapping = {
  'name': 'Name',
  'usersCount': 'Number of users in telegram',
  'newUsersSinceLastUpdate': 'New users in current period',
  'newUsersPercent': 'User growth in current period',
  'msgSinceLastUpdate': 'Messages in current period',
  'avgNoOfMsgPerUser': 'Avg no of messages per user in current period'
};

const usersChartType = 'users';
const usersChartLabel = 'Total number of users';
const messagesChartType = 'messages';
const messagesChartLabel = 'Number of messages';

Vue.component('group-details', {
  props: ['row'],

  data: function() {
    return {
      row: this.row,
      loadingComponent: null,
      buttons: [{
        type: usersChartType,
        label: usersChartLabel,
        isActive: true
      }, {
        type: messagesChartType,
        label: messagesChartLabel,
        isActive: false
      }]
    }
  },

  template: '\
    <div>\
      <div class="buttons is-centered">\
        <button class="button" v-for="x in this.buttons" v-bind:class="[x.isActive ? \'is-primary\' : \'\', \'\']" v-on:click="selectChartType(x.type)">\
          {{ x.label }}\
        </button>\
      </div>\
      <div>\
        <canvas v-bind:id="\'details-chart-\' + this.row.id" height="400px"  width="100%">\
        </canvas>\
      </div>\
    </div>',

  methods: {
    selectChartType: function(type) {
      this.buttons.forEach(x => x.isActive = x.type === type);
      this.drawChart(type)
    },

    drawChart: function(type) {
      const label = this.buttons.find(x => x.type === type).label;
      if (type === usersChartType)
        this.drawDetailsChart(this.data.usersCounts.xs, this.data.usersCounts.ys, label, false);
      else
        this.drawDetailsChart(this.data.msgsStats.xs, this.data.msgsStats.ys, label, true);
    },

    drawDetailsChart: function(xs, ys, yLabel, stepped) {
      const htmlId = `details-chart-${this.row.id}`;
      const ctx = document.getElementById(htmlId).getContext('2d');
      if (this.chart) {
        this.chart.destroy();
      }
      this.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: xs.map(x => moment(x)),
          datasets: [{
            fill: false,
            label: yLabel,
            data: ys,
            borderColor: chartColor,
            lineTension: 0,
            pointRadius: stepped ? 3 : 0,
            pointHitRadius: 4,
            steppedLine: stepped,
          }]
        },
        options: {
          animation: {
            duration: 0, // general animation time
          },
          hover: {
            animationDuration: 0, // duration of animations when hovering an item
          },
          responsiveAnimationDuration: 0, // animation duration after a resize
          responsive: true,
          maintainAspectRatio: false,
          fill: false,
          scales: {
            xAxes: [{
              type: 'time',
              display: true,
              scaleLabel: {
                display: true,
                labelString: "Last 7 days",
              },
              time: {
                unit: 'hour',
                displayFormats: {
                  // hour: 'YYYY-MM-DD hh:mm'
                  hour: 'MMM Do, HH:mm'
                }
              },
              ticks: {
                maxRotation: 45,
                minRotation: 45
              }
            }],
            yAxes: [{
              display: true,
              scaleLabel: {
                display: false,
                labelString: yLabel,
              }
            }]
          }
        }
      });
    }
  },

  beforeDestroy() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
    this.data = null;
  },

  beforeMount() {
    const id = this.row.id;
    this.loadingComponent = this.$loading.open();
    this.$http.get(`${apiAddress}/channels/${id}`).then(response => {
      this.loadingComponent.close();
      this.data = response.body;
      this.drawChart(usersChartType);
    })
  },

});

const app = new Vue({
    el: '#cryptovibe-app',
    data: {
        tableData: [],
        allowedSinceValues: [],
        isPaginated: false,
        isPaginationSimple: false,
        defaultSort: 'usersCount',
        defaultSortDirection: 'desc',
        currentPage: 1,
        perPage: 100,
        sortCol: 'usersCount',
        sortDirection: 'desc',
        mainChart: null,
        loadingComponent: null,
        buttons: { 'Last 24h': true }, // value indicates if it's active
        defaultOpenedDetails: [1],
        details: {}
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
            this.drawChart()
        },
        getAllowedSince: function() {
            this.$http.get(`${apiAddress}/channels/stats-allowed-since-values`).then(response => {
                this.allowedSinceValues = response.body.values;
                const oldButtons = this.buttons;
                this.buttons = {};
                response.body.values.forEach(x => {
                    this.buttons[x] = oldButtons[x] ? oldButtons[x] : false
                });
            }, response => {
            });
        },
        getStats: function(value) {
            this.showLoading();
            Object.keys(this.buttons).forEach(k => this.buttons[k] = k === value);
            this.$http.get(`${apiAddress}/channels/stats`, { params: { since: value } }).then(response => {
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
                        backgroundColor: chartColor,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                }
            });
        },

    },

    beforeMount() {
        this.getAllowedSince();
        const since = Object.keys(this.buttons).find(x => this.buttons[x]);
        this.getStats(since);
    }
});

