const Axios = require('axios');
const Express = require('express');
const sqlite3 = require('sqlite3');
const path = require('path');
var bodyParser = require('body-parser');

const dataPath = 'https://raw.githubusercontent.com/younginnovations/internship-challenges/master/programming/petroleum-report/data.json';
const port = 3000;

let oilNames = ['Petrol', 'Kerosene', 'Diesel', 'Aviation Turbine Fuel', 'Light Diesel Oil', 'Furnace Oil', 'LPG in MT', 'Mineral Turpentine Oil'];

const app = Express();
app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

app.listen(port, () => {
    console.log('listening on port 3000');
});

app.get('/', async (req, res) => {
    let resp = await Axios.get(dataPath);
    var readRecords = function(callback) {
        let actualData = [];
        for (var i = 0; i < Object.keys(resp.data).length; i++) {
            actualData.push(`(${resp.data[i].year}, "${resp.data[i].petroleum_product}", ${resp.data[i].sale})`);
        }
        let placeholders = actualData.map((data) => data).join(',');
        let insertSQL = 'insert into oilsales values ' + placeholders;
        let db = new sqlite3.Database(`${__dirname}/data/data.db`);
        db.serialize(() => {
            db.run('drop table if exists oilsales')
                .run('create table oilsales (year, petroleum_products, sales)')
                .run(insertSQL)
                .each(`select petroleum_products, min(year) as year1,max(year)as year2, max(sales) as max, min(sales) as min, avg(sales) as avg from oilsales where petroleum_products = 'Petrol' and year between 2010 and 2014 and sales <> 0`, (err, row) => {
                    if (err) {
                        throw(err);
                    }
                    callback(row);
                });
            db.close();
        });   
    };
    var defaultResults = function(callback, name, minYear, maxYear) {
        let db = new sqlite3.Database(`${__dirname}/data/data.db`);
        let selectQuery = `select petroleum_products, min(year) as year1,max(year)as year2, max(sales) as max, min(sales) as min, avg(sales) as avg from oilsales where petroleum_products = '${name}' and year between ${minYear} and ${maxYear} and sales <> 0`;
        if (oilNames[name] === 'Mineral Turpentine Oil') {
            selectQuery = `select petroleum_products, min(year) as year1,max(year)as year2, max(sales) as max, min(sales) as min, avg(sales) as avg from oilsales where petroleum_products = 'Mineral Turpentine Oil' and year between ${parseInt(req.body.minYear, 10)} and ${parseInt(req.body.maxYear, 10)}`;
        }
        db.serialize(() => {
            db.each(selectQuery, (err, row) => {
                if (err) {
                    throw(err);
                }
                callback(row);
            });
            db.close();
        });
    };
    readRecords((data) => {
        var sending_data = [];
        for (var i in oilNames) {
            var name = oilNames[i];
            var minYear = 0;
            var maxYear = 0;
            for (var j = 0; j < 3; j++) {
                minYear = 2010 - 5*j;
                maxYear = minYear + 4;
                defaultResults((finalData) => {
                    sending_data.push(finalData.petroleum_products, finalData.year1, finalData.year2, finalData.max, finalData.min, finalData.avg);
                }, name, minYear, maxYear);
            }
        }
        setTimeout(() => {
            res.render('report', {
                oilname: oilNames,
                data: sending_data
            });
        }, 100);
    });
});

app.post('/processresult', (req, res)=>{
    var processDB = function(callback) {
        let db = new sqlite3.Database(`${__dirname}/data/data.db`);
        let selectQuery = `select petroleum_products, min(year) as year1,max(year)as year2, max(sales) as max, min(sales) as min, avg(sales) as avg from oilsales where petroleum_products = '${oilNames[req.body.petroleum]}' and year between ${parseInt(req.body.minYear, 10)} and ${parseInt(req.body.maxYear, 10)} and sales <> 0`;
        if (oilNames[req.body.petroleum] === 'Mineral Turpentine Oil') {
            selectQuery = `select petroleum_products, min(year) as year1,max(year)as year2, max(sales) as max, min(sales) as min, avg(sales) as avg from oilsales where petroleum_products = 'Mineral Turpentine Oil' and year between ${parseInt(req.body.minYear, 10)} and ${parseInt(req.body.maxYear, 10)}`;
        }
        db.serialize(() => {
            db.each(selectQuery, (err, row) => {
                if (err) {
                    throw(err);
                }
                callback(row);
            });
            db.close();
        });
    };
    processDB((data) => {
        var newData = [data.petroleum_products, data.year1, data.year2, data.max, data.min, data.avg];
        res.render('report', {
            oilname: oilNames,
            data: newData
        });
    });
});
