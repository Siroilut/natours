const mongoose= require('mongoose')
const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });
const app = require('./app');


const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);
 
dbConnect().catch(err => console.log(err));
 
async function dbConnect() {
  await mongoose.connect(DB);
}

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

process.on('unhandledRejection', err =>{
  console.log(err.name, err.message);
  console.log('unhandled rejeiction! shutting down...');
  server.close(()=>{
    process.exit(1);
  });
});