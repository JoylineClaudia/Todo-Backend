//connection to mongo db database

const mongoose = require('mongoose');

mongoose.Promise = global.Promise;
mongoose.connect('mongodb+srv://joylinecmachado:jcMACHADO4@todo-task.tv8ff3w.mongodb.net/',
 { useNewUrlParser: true}).then(() => {
    console.log("Connected to mongoDB");
}).catch((e)=> {
    console.log("Error while connecting to mongodb");
    console.log(e);
});


// to prevent depreation warnings
// mongoose.set('useCreateIndex', true);
// mongoose.set('useFindAndModify',false);

module.exports = {
    mongoose
};