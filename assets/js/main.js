Vue.use(Buefy.default);

let sortCol = 'usersCount';
let sortOrd = 'desc';
let width = getWindowWidth();
const maxMobileRes = 768;
const maxNoInChart = 11;

const cryptoData = tableData.infos.map(x => {
    // format to 2 decimal places
    x.newUsersPercent = x.newUsersSinceLastUpdate === null ? null : Math.round((10000 * x.newUsersSinceLastUpdate) / (x.usersCount - x.newUsersSinceLastUpdate)) / 100;
    x.avgNoOfMsgPerUser = x.msgSinceLastUpdate === null ? null : Math.round(100 * x.msgSinceLastUpdate / x.usersCount) / 100;
    return x;
});

// when c
const colMapping = {
  'name': 'Name',
  'usersCount': 'Number of users in telegram',
  'newUsersSinceLastUpdate': 'New users in current period',
  'newUsersPercent': 'User growth in current period',
  'msgSinceLastUpdate': 'Messages in current period',
  'avgNoOfMsgPerUser': 'Avg no of messages per user in current period'
};

(function() {
    const throttle = function (type, name, obj) {
        obj = obj || window;
        let running = false;
        const func = function () {
            if (running) {
                return;
            }
            running = true;
            requestAnimationFrame(function () {
                obj.dispatchEvent(new CustomEvent(name));
                running = false;
            });
        };
        obj.addEventListener(type, func);
    };

    /* init - you can init any event */
    throttle("resize", "optimizedResize");
})();

window.addEventListener("optimizedResize", function() {
    const newWidth = getWindowWidth();
    if (width !== newWidth) {
        width = newWidth;
        drawBasic(sortCol, sortOrd);
    }
});


const app = new Vue({
    el: '#cryptovibe-app',
    data: {
        tableData: cryptoData,
        isPaginated: false,
        isPaginationSimple: false,
        defaultSort: sortCol,
        defaultSortDirection: sortOrd,
        currentPage: 1,
        perPage: 100,
        periodStart: tableData.period.prettyFrom,
        periodEnd: tableData.period.prettyTo
    },

    methods: {
        onSort: function(col, ordering) {
            drawBasic(col, ordering)
        }
    }
});

google.charts.load('current', {packages: ['corechart', 'bar']});
google.charts.setOnLoadCallback(() => drawBasic(sortCol, sortOrd));

function getWindowWidth() {
    return window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
}

function drawBasic(col, ord) {
    sortCol = col;
    sortOrd = ord;

    const arrayData = cryptoData
        .map(x => x)
        .filter(x => x[col] !== null)
        .sort((a, b) => {
            if (ord === 'asc')
                return a[col] - b[col];
            else
                return b[col] - a[col];
        })
        .slice(0, maxNoInChart)
        .map(x => { return [x.name, x[col]] });

    const headers = [['Crypto channel', colMapping[col],]];

    const data = google.visualization.arrayToDataTable(headers.concat(arrayData));

    const legendPosition = getWindowWidth() <= maxMobileRes ? 'none' : 'right';

    const options = {
        title: 'Telegram activity on crypto channels',
        legend: { position: legendPosition, maxLines: 3 },
        hAxis: {
            title: colMapping[col],
            minValue: Math.min(0, ...arrayData.map(x => x[col]))
        },
        height: 400,
        isStacked: true,
        bars: 'horizontal'
    };

    const chart = new google.charts.Bar(document.getElementById('chart'));

    chart.draw(data, options);
}
