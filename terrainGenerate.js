/*
* A terrain helper class to generate the height using diamond square algorithm
* @param size: a int for the terrain dimension
* @param z_arr: a temprary arry to store z values
* @param roughness: a int for the roughness 
*/
class TerrainGenerate{
    constructor(length, roughness){
        this.size = length;
        this.z_arr = new Float32Array(this.size * this.size);
        this.roughness = roughness;
    }
    
    
    /**
    * A set value helper function for setting z value from x, y
    */
    setZValue(x, y, z){
        this.z_arr[x+y*this.size] = z;
    }
    
    /**
    * A get value helper function for getting z value from x, y,
    * if the x or y input is out of bounds, return -1
    */
    getZValue(x, y){
        if(x < 0 || y < 0 || x >= this.size || y >= this.size){
            return -1;
        }
        return this.z_arr[x + y * this.size];
    }
    
    /**
    * The diamond square algorithm to calculate z value
    */
    diamondSquare(){
        var x, y;
        var size = this.size-1;
        var half = size/2;
        
         while(size > 1){   
            for(y = half; y < this.size -1; y += size){
                for(x = half; x < this.size-1; x+=size){
                    this.squareStep(x, y, half, (Math.random()-0.5)*this.roughness*size);
                }
            }
            
            for(y = 0; y < this.size-1; y += half){
                for(x = (y+half)%size; x < this.size-1; x+=size){
                    this.diamondStep(x, y, half, (Math.random()-0.5)*this.roughness*size);
                }
            }
            size = size/2;
            half = size/2;
         }
    }
    
    /**
    * The square step helper, to calculate the average using average function
    */
    squareStep(x, y, size, offset){
        var average = this.averageHelper([this.getZValue(x-size, y-size),
                                   this.getZValue(x+size, y-size),
                                   this.getZValue(x-size, y+size),
                                   this.getZValue(x+size, y+size)]);
        this.setZValue(x, y, average+offset);
    }

    /**
    * The diamond step helper, to calculate the average using average functions
    */
    diamondStep(x, y, size, offset){
        var average = this.averageHelper([this.getZValue(x, y-size),
                                   this.getZValue(x, y+size),
                                   this.getZValue(x+size, y),
                                   this.getZValue(x-size, y)]);
        this.setZValue(x, y, average+offset);
    }


    /**
    * The average helper function
    */
    averageHelper(value){
        var valid = value.filter(function(val){return val !== -1;});
        var total = valid.reduce(function(sum, val){return sum+val;}, 0);
        return total/valid.length;
    }
    
}