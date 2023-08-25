const fs = require('fs');
const mongoose= require('mongoose')
const dotenv = require('dotenv');
const Tour = require('./../../models/tourModel');


dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);
 
dbConnect().catch(err => console.log(err));
 
async function dbConnect() {
  await mongoose.connect(DB);
}

//read json  file
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8'));

//IMPORT DATA INTO DB
const importData = async () => {
    try {
        await Tour.create(tours);
        console.log('data sucessfully loaded!');
        process.exit();


    }catch(err){
        console.log(err)
    }
};

// DELETE ALL DATA FROM DB
const deleteData = async() =>{
    try {
        await Tour.deleteMany();
        console.log('data sucessfully loaded!');
        process.exit();


    }catch(err){
        console.log(err)
    }
};

if(process.argv[2] === '--import'){
    importData()
}else if(process.argv[2] === '--delete'){
    deleteData();
}

console.log(process.argv);