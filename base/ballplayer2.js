import { Signal } from './widget.js'; // paths for base widget inheritance
import { BillBoard, BallPlayer } from './ballplayer.js'; // extends ballplayer.js

class BillBoard2 extends BillBoard { /*//DOC
    Extends class BillBoard.  This widget knows how to (de)serialize it's state
    */
    createSignals() {
        this.signals.state_change = new Signal();
    }
    ball_throw_slot() { /*//DOC
        Sending signal to this slot, increments the number of how many times
        a ball has been thrown
        */
        super.ball_throw_slot()
        this.stateSave()
    }
    stateToPar() { // defines state serialization
        return this.counter.toString()
    }
    validatePar(par) { // return false if par can't parsed as an integer value
        return !isNaN(parseInt(par))
    }
    parToState(par) { // define state deserialization
        this.counter = parseInt(par)
        this.log(-1, "parToState: counter", this.counter)
        this.updateMessage()
    }
}

class BallPlayer2 extends BallPlayer { /*//DOC
    Extends class BallPlayer2.  This widget knows how to (de)serialize it's state
    */
    createSignals() {
        super.createSignals()
        this.signals.state_change = new Signal() // required for state management
    }
    catch_ball_slot() { /*//DOC
        Sending a signal to this slot, gives the ball to this widget
        */
        super.catch_ball_slot()
        this.stateSave()
    }
    stateToPar() { // define state serialization
        let par = +this.has_ball // boolean to int
        this.log(-1, "stateToPar", par)
        return par.toString() 
    }
    validatePar(par) { // validate a serialized state
        // return false if par can't parsed as an integer value
        let i = parseInt(par)
        if (isNaN(i)) { // not an integer
            this.err("validatePar failed with par",par,":",i,"not a number")
            return false
        }
        if (i!=0 && i!=1) {
            this.err("validatePar failed with :",i,"not 0 or 1")
            return false
        }
        return true;
    }
    parToState(par) { // define state deserialization
        this.has_ball = (parseInt(par) == 1) // int to bool
        this.log(-1, "parToState", this.has_ball)
        this.setBall()
    }
    createState() {
        super.createState()
        this.stateSave()
        // initialize to not having a ball
    }
    throwBall() {
        if (!this.has_ball) {
            // we don't have the ball..
            return
        }
        this.has_ball = false
        this.setBall()
        this.stateSave()
        this.signals.throw_ball.emit()
    }
    
} // BallPlayer

export { BallPlayer2, BillBoard2 }
