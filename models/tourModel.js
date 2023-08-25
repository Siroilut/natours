const mongoose= require('mongoose')
const slugify= require('slugify');
const validator = require('validator');

const tourSchema = new mongoose.Schema({
    name:{
      type:String,
      required: [true, 'a tour must have a name'],
      unique: true,
      maxlength: [40, 'a tour name must have  less or equal then 40 characters'],
      minlength: [10, 'a tour name must have  more or equal then 10 characters'],
      

    },
    slug: String,
    duration:{
      type: Number,
      required:[true, 'a tour must have a duration']
    },
    maxGroupSize:{
      type:Number,
      required: [true, 'a tour must have a group size']
    },
    difficulty:{
      type: String,
      required: [true, 'a tour must havea difficulty'],
      enum: {
        values:["easy","medium","difficult"],
        message: 'difficulty is either: easy, medium or difficult',
     
    }
    },
    ratingAverage:{
      type: Number,
      default: 4.5,
      min: [1, 'rating must be above 1.0'],
      max: [5, 'rating must be below 1.0'],

    },
    ratingQuantaty:{
      type: Number,
      default: 0
    },
    price:{
      type: Number,
      required: [true, 'a tour must have a price']
    },
    priceDiscout:{
      type: Number,
      validate:{
        validator: function(val){
          //this only  point to current doc on NEW document creation
          return val < this.price;
        },
        message: 'discount price ({VALUE}) should be below regular price'
      },
    },
      summery:{
        type: String,
        trim: true,
        required: [true, 'a tour must have a description']
      },
  
    description: {
      type: String,
      trim: true
    },
    imageCover: {
      type: String,
      required:[true, 'a tour must have a cover image']
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select:  false
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false
    },

    startLocation: {
      // GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates: [Number],
      address: String,
      description: String
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number
      }
    ],
  },

  {

  toJSON: {virtuals: true},
  toObject: {virtuals: true}
  });
  
tourSchema.virtual('durationWeeks').get(function() {
  return this.duration / 7
});

//document middleware: runs before .save() and .create()
tourSchema.pre('save', function(next){
  this.slug = slugify(this.name,{lower: true});
  next();
});

tourSchema.post('save', function(doc, next){
  console.log(doc);
  next(); 

});

//query middleware
tourSchema.pre(/^find/, function(next){
  this.find({secretTour:{$ne: true} });

  next();
});
//aggregation middleware
tourSchema.pre('aggregate', function(next) {
  this.papeline().unshift({$match:{secretTour: {$ne: true} } } );
console.log(this.pipeline());
next();


})

  const Tour = mongoose.model('Tour', tourSchema);

  module.exports = Tour;