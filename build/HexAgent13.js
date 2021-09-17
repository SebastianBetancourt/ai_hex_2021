require=(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({"/src/HexAgent.js":[function(require,module,exports){
const Agent = require('ai-agents').Agent;
const getEmptyHex = require('./getEmptyHex');
const minMax = require('./minMax');

class HexAgent extends Agent {
    constructor(value) {
        super(value);
        this.cache = {}
    }
    
    /**
     * return a new move. The move is an array of two integers, representing the
     * row and column number of the hex to play. If the given movement is not valid,
     * the Hex controller will perform a random valid movement for the player
     * Example: [1, 1]
     */
    send() {
        let board = this.perception;
        let size = board.length;
        let available = getEmptyHex(board);
        let nTurn = size * size - available.length;

        if (nTurn == 0) { // First move
            return [0, 0];
            return [Math.floor(size / 2) - 1, Math.floor(size / 2) + 1 ];
        }
        const MAX = Number.MAX_SAFE_INTEGER;

        let result = minMax(board, this.getID(), this.getID(), 0, 1, -MAX, MAX, this.cache, null);
        //console.log('Mov:'+result.move+' '+result.score)
        return result.move
    }
}

module.exports = HexAgent;
},{"./getEmptyHex":8,"./minMax":9,"ai-agents":4}],1:[function(require,module,exports){
//const tf = require('@tensorflow/tfjs-node');

class Agent {
    constructor(name) {
        this.id = name;
        if (!name) {
            this.id = Math.round(Math.random() * 10e8);
        }
        this.state = null;
        this.perception = null;
        this.table = { "default": 0 };
    }

    /**
     * Setup of the agent. Could be override by the class extension
     * @param {*} parameters 
     */
    setup(initialState = {}) {
        this.initialState = initialState;
    }
    /**
     * Function that receive and store the perception of the world that is sent by the agent controller. This data is stored internally
     * in the this.perception variable
     * @param {Object} inputs 
     */
    receive(inputs) {
        this.perception = inputs;
    }

    /**
     * Inform to the Agent controller about the action to perform
     */
    send() {
        return table["deafult"];
    }

    /**
     * Return the agent id
     */
    getLocalName() {
        return this.id;
    }

    /**
      * Return the agent id
      */
    getID() {
        return this.id;
    }

    /**
     * Do whatever you do when the agent is stoped. Close connections to databases, write files etc.
     */
    stop() {}
}

module.exports = Agent;
},{}],2:[function(require,module,exports){

class AgentController {
    constructor() {
        this.agents = {};
        this.world0 = null;
        this.world = null;
        this.actions = [];
        this.data = { states: [], world: {} };
    }
    /**
     * Setup the configuration for the agent controller
     * @param {Object} parameter 
     */
    setup(parameter) {
        this.problem = parameter.problem;
        this.world0 = JSON.parse(JSON.stringify(parameter.world));
        this.data.world = JSON.parse(JSON.stringify(parameter.world));
    }
    /**
     * Register the given agent in the controller pool. The second parameter stand for the initial state of the agent
     * @param {Agent} agent 
     * @param {Object} state0 
     */
    register(agent, state0) {
        if (this.agents[agent.getID()]) {
            throw 'AgentIDAlreadyExists';
        } else {
            this.agents[agent.getID()] = agent;
            this.data.states[agent.getID()] = state0;
            //TODO conver state0 to an inmutable object
            agent.setup(state0);
        }
    }
    /**
     * Remove the given agent from the controller pool
     * @param {Object} input 
     */
    unregister(input) {
        let id = "";
        if (typeof input == 'string') {
            id = input;
        } else if (typeof input == 'object') {
            id = input.getID();
        } else {
            throw 'InvalidAgentType';
        }
        let agent = this.agents[id];
        agent.stop();
        delete this.agents[id];
    }

    /**
    * This function start the virtual life. It will continously execute the actions
    * given by the agents in response to the perceptions. It stop when the solution function
    * is satisfied or when the max number of iterations is reached.
    * If it must to run in interactive mode, the start mode return this object, which is actually 
    * the controller
    * @param {Array} callbacks 
    */
    start(callbacks, interactive = false) {
        this.callbacks = callbacks;
        this.currentAgentIndex = 0;
        if (interactive === false) {
            this.loop();
            return null;
        } else {
            return this;
        }
    }

    /**
     * Executes the next iteration in the virtual life simulation
     */
    next() {
        if (!this.problem.goalTest(this.data)) {
            let keys = Object.keys(this.agents);
            let agent = this.agents[keys[this.currentAgentIndex]];
            agent.receive(this.problem.perceptionForAgent(this.getData(), agent.getID()));
            let action = agent.send();
            this.actions.push({ agentID: agent.getID(), action });
            this.problem.update(this.data, action, agent.getID());
            if (this.problem.goalTest(this.data)) {
                this.finishAll();
                return false;
            } else {
                if (this.callbacks.onTurn) {
                    this.callbacks.onTurn({ actions: this.getActions(), data: this.data });
                }
                if (this.currentAgentIndex >= keys.length - 1) this.currentAgentIndex = 0;else this.currentAgentIndex++;
                return true;
            }
        }
    }

    /**
     * Virtual life loop. At the end of every step it executed the onTurn call back. It could b used for animations of login
     */
    loop() {
        let stop = false;
        while (!stop) {
            //Creates a thread for every single agent
            Object.values(this.agents).forEach(agent => {
                if (!this.problem.goalTest(this.data)) {
                    agent.receive(this.problem.perceptionForAgent(this.getData(), agent.getID()));
                    let action = agent.send();
                    this.actions.push({ agentID: agent.getID(), action });
                    this.problem.update(this.data, action, agent.getID());
                    if (this.problem.goalTest(this.data)) {
                        stop = true;
                    } else {
                        if (this.callbacks.onTurn) this.callbacks.onTurn({ actions: this.getActions(), data: this.data });
                    }
                }
            });
        }
        this.finishAll();
    }

    /**
     * This function is executed once the virtual life loop is ended. It must stop every single agent in the pool
     * and execute the onFinish callback 
     */
    finishAll() {
        // Stop all the agents
        Object.values(this.agents).forEach(agent => {
            //agent.stop();
            this.unregister(agent);
        });
        //Execute the callback
        if (this.callbacks.onFinish) this.callbacks.onFinish({ actions: this.getActions(), data: this.data });
    }

    /**
     * Return a copu of the agent controller data. The returned object contains the data of the problem (world) and the
     * state of every single agent in the controller pool (states)
     */
    getData() {
        return this.data;
    }
    /**
     * Return the history of the actions performed by the agents during the current virtual life loop
     */
    getActions() {
        return JSON.parse(JSON.stringify(this.actions));
    }

    /**
     * This function stop all the threads started by the agent controller and stops registered agents
     */
    stop() {
        this.finishAll();
    }
}

module.exports = AgentController;
},{}],3:[function(require,module,exports){
const AgentController = require('../core/AgentController');

/**
 * This class specifies the problem to be solved
 */
class Problem {
    constructor(initialState) {
        this.controller = new AgentController();
    }

    /**
     * Check if the given solution solves the problem. You must override
     * @param {Object} solution 
     */
    goalTest(solution) {}
    //TODO return boolean


    /**
     * The transition model. Tells how to change the state (data) based on the given actions. You must override
     * @param {} data 
     * @param {*} action 
     * @param {*} agentID 
     */
    update(data, action, agentID) {}
    //TODO modify data


    /**
     * Gives the world representation for the agent at the current stage
     * @param {*} agentID 
     * @returns and object with the information to be sent to the agent
     */
    perceptionForAgent(data, agentID) {}
    //TODO return the perception


    /**
     * Add a new agent to solve the problem
     * @param {*} agentID 
     * @param {*} agentClass 
     * @param {*} initialState 
     */
    addAgent(agentID, agentClass, initialState) {
        let agent = new agentClass(agentID);
        this.controller.register(agent, initialState);
    }

    /**
     * Solve the given problem
     * @param {*} world 
     * @param {*} callbacks 
     */
    solve(world, callbacks) {
        this.controller.setup({ world: world, problem: this });
        this.controller.start(callbacks, false);
    }

    /**
    * Returns an interable function that allow to execute the simulation step by step
    * @param {*} world 
    * @param {*} callbacks 
    */
    interactiveSolve(world, callbacks) {
        this.controller.setup({ world: world, problem: this });
        return this.controller.start(callbacks, true);
    }
}

module.exports = Problem;
},{"../core/AgentController":2}],4:[function(require,module,exports){
const Problem = require('./core/Problem');
const Agent = require('./core/Agent');
const AgentController = require('./core/AgentController');

module.exports = { Problem, Agent, AgentController };
},{"./core/Agent":1,"./core/AgentController":2,"./core/Problem":3}],5:[function(require,module,exports){
module.exports = require('./lib/heap');

},{"./lib/heap":6}],6:[function(require,module,exports){
// Generated by CoffeeScript 1.8.0
(function() {
  var Heap, defaultCmp, floor, heapify, heappop, heappush, heappushpop, heapreplace, insort, min, nlargest, nsmallest, updateItem, _siftdown, _siftup;

  floor = Math.floor, min = Math.min;


  /*
  Default comparison function to be used
   */

  defaultCmp = function(x, y) {
    if (x < y) {
      return -1;
    }
    if (x > y) {
      return 1;
    }
    return 0;
  };


  /*
  Insert item x in list a, and keep it sorted assuming a is sorted.
  
  If x is already in a, insert it to the right of the rightmost x.
  
  Optional args lo (default 0) and hi (default a.length) bound the slice
  of a to be searched.
   */

  insort = function(a, x, lo, hi, cmp) {
    var mid;
    if (lo == null) {
      lo = 0;
    }
    if (cmp == null) {
      cmp = defaultCmp;
    }
    if (lo < 0) {
      throw new Error('lo must be non-negative');
    }
    if (hi == null) {
      hi = a.length;
    }
    while (lo < hi) {
      mid = floor((lo + hi) / 2);
      if (cmp(x, a[mid]) < 0) {
        hi = mid;
      } else {
        lo = mid + 1;
      }
    }
    return ([].splice.apply(a, [lo, lo - lo].concat(x)), x);
  };


  /*
  Push item onto heap, maintaining the heap invariant.
   */

  heappush = function(array, item, cmp) {
    if (cmp == null) {
      cmp = defaultCmp;
    }
    array.push(item);
    return _siftdown(array, 0, array.length - 1, cmp);
  };


  /*
  Pop the smallest item off the heap, maintaining the heap invariant.
   */

  heappop = function(array, cmp) {
    var lastelt, returnitem;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    lastelt = array.pop();
    if (array.length) {
      returnitem = array[0];
      array[0] = lastelt;
      _siftup(array, 0, cmp);
    } else {
      returnitem = lastelt;
    }
    return returnitem;
  };


  /*
  Pop and return the current smallest value, and add the new item.
  
  This is more efficient than heappop() followed by heappush(), and can be
  more appropriate when using a fixed size heap. Note that the value
  returned may be larger than item! That constrains reasonable use of
  this routine unless written as part of a conditional replacement:
      if item > array[0]
        item = heapreplace(array, item)
   */

  heapreplace = function(array, item, cmp) {
    var returnitem;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    returnitem = array[0];
    array[0] = item;
    _siftup(array, 0, cmp);
    return returnitem;
  };


  /*
  Fast version of a heappush followed by a heappop.
   */

  heappushpop = function(array, item, cmp) {
    var _ref;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    if (array.length && cmp(array[0], item) < 0) {
      _ref = [array[0], item], item = _ref[0], array[0] = _ref[1];
      _siftup(array, 0, cmp);
    }
    return item;
  };


  /*
  Transform list into a heap, in-place, in O(array.length) time.
   */

  heapify = function(array, cmp) {
    var i, _i, _j, _len, _ref, _ref1, _results, _results1;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    _ref1 = (function() {
      _results1 = [];
      for (var _j = 0, _ref = floor(array.length / 2); 0 <= _ref ? _j < _ref : _j > _ref; 0 <= _ref ? _j++ : _j--){ _results1.push(_j); }
      return _results1;
    }).apply(this).reverse();
    _results = [];
    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
      i = _ref1[_i];
      _results.push(_siftup(array, i, cmp));
    }
    return _results;
  };


  /*
  Update the position of the given item in the heap.
  This function should be called every time the item is being modified.
   */

  updateItem = function(array, item, cmp) {
    var pos;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    pos = array.indexOf(item);
    if (pos === -1) {
      return;
    }
    _siftdown(array, 0, pos, cmp);
    return _siftup(array, pos, cmp);
  };


  /*
  Find the n largest elements in a dataset.
   */

  nlargest = function(array, n, cmp) {
    var elem, result, _i, _len, _ref;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    result = array.slice(0, n);
    if (!result.length) {
      return result;
    }
    heapify(result, cmp);
    _ref = array.slice(n);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      elem = _ref[_i];
      heappushpop(result, elem, cmp);
    }
    return result.sort(cmp).reverse();
  };


  /*
  Find the n smallest elements in a dataset.
   */

  nsmallest = function(array, n, cmp) {
    var elem, i, los, result, _i, _j, _len, _ref, _ref1, _results;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    if (n * 10 <= array.length) {
      result = array.slice(0, n).sort(cmp);
      if (!result.length) {
        return result;
      }
      los = result[result.length - 1];
      _ref = array.slice(n);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        elem = _ref[_i];
        if (cmp(elem, los) < 0) {
          insort(result, elem, 0, null, cmp);
          result.pop();
          los = result[result.length - 1];
        }
      }
      return result;
    }
    heapify(array, cmp);
    _results = [];
    for (i = _j = 0, _ref1 = min(n, array.length); 0 <= _ref1 ? _j < _ref1 : _j > _ref1; i = 0 <= _ref1 ? ++_j : --_j) {
      _results.push(heappop(array, cmp));
    }
    return _results;
  };

  _siftdown = function(array, startpos, pos, cmp) {
    var newitem, parent, parentpos;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    newitem = array[pos];
    while (pos > startpos) {
      parentpos = (pos - 1) >> 1;
      parent = array[parentpos];
      if (cmp(newitem, parent) < 0) {
        array[pos] = parent;
        pos = parentpos;
        continue;
      }
      break;
    }
    return array[pos] = newitem;
  };

  _siftup = function(array, pos, cmp) {
    var childpos, endpos, newitem, rightpos, startpos;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    endpos = array.length;
    startpos = pos;
    newitem = array[pos];
    childpos = 2 * pos + 1;
    while (childpos < endpos) {
      rightpos = childpos + 1;
      if (rightpos < endpos && !(cmp(array[childpos], array[rightpos]) < 0)) {
        childpos = rightpos;
      }
      array[pos] = array[childpos];
      pos = childpos;
      childpos = 2 * pos + 1;
    }
    array[pos] = newitem;
    return _siftdown(array, startpos, pos, cmp);
  };

  Heap = (function() {
    Heap.push = heappush;

    Heap.pop = heappop;

    Heap.replace = heapreplace;

    Heap.pushpop = heappushpop;

    Heap.heapify = heapify;

    Heap.updateItem = updateItem;

    Heap.nlargest = nlargest;

    Heap.nsmallest = nsmallest;

    function Heap(cmp) {
      this.cmp = cmp != null ? cmp : defaultCmp;
      this.nodes = [];
    }

    Heap.prototype.push = function(x) {
      return heappush(this.nodes, x, this.cmp);
    };

    Heap.prototype.pop = function() {
      return heappop(this.nodes, this.cmp);
    };

    Heap.prototype.peek = function() {
      return this.nodes[0];
    };

    Heap.prototype.contains = function(x) {
      return this.nodes.indexOf(x) !== -1;
    };

    Heap.prototype.replace = function(x) {
      return heapreplace(this.nodes, x, this.cmp);
    };

    Heap.prototype.pushpop = function(x) {
      return heappushpop(this.nodes, x, this.cmp);
    };

    Heap.prototype.heapify = function() {
      return heapify(this.nodes, this.cmp);
    };

    Heap.prototype.updateItem = function(x) {
      return updateItem(this.nodes, x, this.cmp);
    };

    Heap.prototype.clear = function() {
      return this.nodes = [];
    };

    Heap.prototype.empty = function() {
      return this.nodes.length === 0;
    };

    Heap.prototype.size = function() {
      return this.nodes.length;
    };

    Heap.prototype.clone = function() {
      var heap;
      heap = new Heap();
      heap.nodes = this.nodes.slice(0);
      return heap;
    };

    Heap.prototype.toArray = function() {
      return this.nodes.slice(0);
    };

    Heap.prototype.insert = Heap.prototype.push;

    Heap.prototype.top = Heap.prototype.peek;

    Heap.prototype.front = Heap.prototype.peek;

    Heap.prototype.has = Heap.prototype.contains;

    Heap.prototype.copy = Heap.prototype.clone;

    return Heap;

  })();

  (function(root, factory) {
    if (typeof define === 'function' && define.amd) {
      return define([], factory);
    } else if (typeof exports === 'object') {
      return module.exports = factory();
    } else {
      return root.Heap = factory();
    }
  })(this, function() {
    return Heap;
  });

}).call(this);

},{}],7:[function(require,module,exports){
/**
 * Heuristica que implementa una 2-distancia para medir el potencial de cada casilla. 
 * El potencial de un tablero es el mayor de los potenciales de las casillas que tenga vacías.
 * 
 * Tomada de:
 * J. van Rijswijck, “Are bees better than fruitflies?” in Conference of the Canadian Society 
 * for Computational Studies of Intelligence. Springer, 2000, pp. 13–25.
 * 
 * @param {*} board estado del juego
 * @returns un numero que califica qué tan beneficioso es el estado del tablero board para el jugador.
 *  Entre mayor, más ventajosa es cierta posición.
 */

const Heap = require('heap')
 


function boardScore(boardT, player) {
	const vecindario1 = {}, vecindario2 = {}
	// Copia profunda de board y 
	// Agregar bordes como fichas. Esto incrementa el ancho y el alto del tablero en 2.
	// negras arriba y abajo, blancas a los lados
    let arriba = '2' // negras
    let lado = '1' // blancas
	let board = new Array(boardT.length+2);
	board[0] = new Array(board.length).fill(arriba)
	for (let i = 1; i < boardT.length+1; i++) {
	    board[i] = boardT[i-1].slice();
	    board[i].unshift(lado)
	    board[i].push(lado)
	  }
	board[boardT.length+1] = new Array(board[0].length).fill(arriba)
	
	let size = board.length
	const INFINITO = size * size + 5// numero lo suficientemente grande para asegurar que no va a ser nunca un resultado
	//imprimir(board)
	// 2-distancia
	/**
	 * Calcula la 2-distancia entre todas las casillas y p
	 * 
	 * La 2-distancia es 1 más que la segunda distancia menor desde los vecinos de p hasta q.
	 * La idea es jugar teniendo en cuenta dos caminos al mismo tiempo, es decir, contando con el camino
	 * más corto (y el que probablemente el enemigo va a bloquear) y con el segundo más corto, que sería otra
	 * opción para jugar. La distancia de este camino más corto es la 2-distancia, con la excepción de que
	 * si p y q son adyacentes, la 2-distancia es igual a 1.
	 * 
	 * Esta implementacion es una modificacion de Dijkstra que calcula 2-distancias
	 * 
	 *  	 distanciaWIzq = dosdistancia(2 * size, '1', board)
	 distanciaWDer = dosdistancia(2 * size + size - 1, '1', board)
	 distanciaBArr = dosdistancia(2, '2', board)
	 distanciaBAba = dosdistancia((size-1) * size + 4, '2', board)
	 * p es un id: id = row * size + col;
	 * 
	 */
	function dosdistancia(p, player, board){
		//let hash = getHash(board)
		//if(p == 2 * size && cacheWIzq[hash]) return cacheWIzq[hash] 
		//if(p == 2 * size + size - 1 && cacheWDer[hash]) return cacheWDer[hash] 
		//if(p == 2 && cacheBArr[hash]) return cacheBArr[hash] 
		//if(p == (size-1) * size + 4 && cacheBaba[hash]) return cacheBaba[hash] 

		let distancia = new Array(size*size).fill(INFINITO)
		let cola = new Heap((a,b) => distancia[a] - distancia[b])
		distancia[p] = 0
		vecindario(p, player, board).forEach(a => distancia[a] = 1)

		Array.from({length: size*size}, (e, i) => i).forEach(r => cola.push(r)) // [0,1,2,3,4 ...]
		while(!cola.empty()){
			let u = cola.pop()
			//console.log(u)
			adyacentes(u).forEach(v => {
				if(getById(board, v) == player) return
				let k = 0
				let c_kp = []
				let vec = []
				while(c_kp.length < 2 && k <= INFINITO){
					vec = vecindario(v, player, board)
					c_kp = vec.filter(r => distancia[r] < k)
					if(c_kp.length < 2) k++
				}

				if(k < distancia[v] && getById(board, v) != cambiarJugador(player) && k < INFINITO){
					distancia[v] = k
					cola.updateItem(v)
					vec.forEach(r => cola.push(r))
				}
			})
		}
		// tapar p con infinito
		distancia[p] = INFINITO
		return distancia
	}
	
	// devuelve la lista de ids de las casillas adyacentes
	function adyacentes(id){
		let row = Math.floor(id / size)
		let col = id % size
		let result = []
		
		function pushIfAny(row, col) {
			if (row >= 0 && row < size && col >= 0 && col < size) {
					result.push(col + row * size);
			}
		}
		pushIfAny(row - 1, col);
		pushIfAny(row - 1, col + 1);
		pushIfAny(row, col - 1);
		pushIfAny(row, col + 1);
		pushIfAny(row + 1, col - 1);
		pushIfAny(row + 1, col);
		return result
	}

	// el vecindario de una casilla son todas las casillas a las que se puede conectar con una sola ficha.
	// Esto implica que se tienen cuenta las fichas ya puestas. El vecindario de una casilla son todas sus adyacentes,
	// mas las que puede conectarse con una cadena de fichas del color de jugador. Es decir, que el vecindario varia para cada jugador
	function vecindario(id, jugador, board){
		if(jugador == '1' && vecindario1[id]) return vecindario1[id]
		if(jugador == '2' && vecindario2[id]) return vecindario2[id]
		let cola = adyacentes(id).filter(r => getById(board,r) == jugador)
		let result = adyacentes(id).filter(r => getById(board,r) == 0)
		let i = 0
		while(cola.length > i){
			if(getById(board, cola[i]) == jugador)
			{
				cola.push(...adyacentes(cola[i]).filter(r => cola.indexOf(r) == -1 && r != id && getById(board, r) == jugador))
				result.push(...adyacentes(cola[i]).filter(r => result.indexOf(r) == -1 && r != id && getById(board, r) == 0))
			}
			i++
		}
		if(jugador == '1') vecindario1[id] = result
		if(jugador == '2') vecindario2[id] = result
		return result
	}

	getById = (board, id) => board[Math.floor(id / size)][id % size]
	cambiarJugador = jugador => jugador == '1' ? '2' : '1'
	function imprimir(board, titulo = ''){
		console.log(titulo)
		for (var i = 0; i < board.length; i++) {
			console.log(board[i].map(r => {
				if(Math.abs(r) < 10) return ' '+r.toString() 
					else if(Math.abs(r) >= INFINITO) return ' ∞'
						else return r.toString()
			}).toString())
		}
	}

	 distanciaWIzq = dosdistancia(2 * size, '1', board)
	 distanciaWDer = dosdistancia(2 * size + size - 1, '1', board)
	 distanciaBArr = dosdistancia(2, '2', board)
	 distanciaBAba = dosdistancia((size-1) * size + 4, '2', board)
	let potencial = []
	let potencialMinimo = INFINITO
	let empate = 0

	for (let i = 0; i < size*size; i++){
		potencial.push(distanciaWIzq[i]+distanciaWDer[i]+distanciaBArr[i]+distanciaBAba[i])
		if(potencial[i]< potencialMinimo){
			potencialMinimo = potencial[i]
			empate = 0
		}else if(potencial[i] == potencialMinimo) empate++
	}
	
	
	// Esta heuristica asigna el menor valor al mejor tablero. Para que sea apta para un MiniMax que maximiza al final, se retorna negativo
	// empate es el numero de casillas con potencial minimo. Si dos boards tienen el mismo potencial minimo, pero uno tiene ese mismo potencial
	// en mas casillas, ese es mejor. Se agregan como decimas


	return -potencialMinimo+(empate * 0.01)
	//return 1
}


 function getHash(board) {
  let hash = '';
  board.forEach(row => {
    row.forEach(cell => {
      hash += cell;
    });
  });
  return hash;
}

module.exports = boardScore;
},{"heap":5}],8:[function(require,module,exports){
/**
 * Return an array containing the id of the empty hex in the board
 * id = row * size + col;
 * @param {Matrix} board 
 */
function getEmptyHex(board) {
  let result = [];
  let size = board.length;
  for (let k = 0; k < size; k++) {
      for (let j = 0; j < size; j++) {
          if (board[k][j] === 0) {
              result.push(k * size + j);
          }
      }
  }
  return result;
}

module.exports = getEmptyHex;
},{}],9:[function(require,module,exports){
const transpose = require('./transposeHex');
const boardScore = require('./boardScore');
const getEmptyHex = require('./getEmptyHex');

 let counter = 0;

 /**
 * Return the best move for the player 1. Before calling this function you must
 * transpose the player board, so we always consider that the player is connecting
 * the left and the right sides of the board.
 * @param {*} board 
 * @param {*} player0 
 * @param {*} player 
 * @param {*} level 
 * @param {*} maxLevel 
 * @param {*} alpha 
 * @param {*} beta 
 * @param {*} cache 
 */
function minMax(board, player0, player, level, maxLevel, alpha, beta, cache, available) {
  const MAX_SCORE = 0;
  const MIN_SCORE = -(board.length + 2) * (board.length + 2) - 10 - 1;

  let heuristic_calls = 0
  if (available == null)
    available = getCandidates(board); //getEmptyHex(board);
  let bestScore = Number.MIN_SAFE_INTEGER;
  if (level % 2 == 1) {
    bestScore = Number.MAX_SAFE_INTEGER;
  }
  let bestMove = [];
  let maxActions = available.length;
  for (let i = 0; i < maxActions; i++) {
    if (available[i] >= 0) {
      let move = available[i];
      let action = [Math.floor(move / board.length), move % board.length];
      available[i] = -1;
      board[action[0]][action[1]] = player;
      let score = 0;

       // Chech if we already have a score for this board
      let cacheKey = getHash(board);
      if (cache[cacheKey]) {
        score = cache[cacheKey];
      } else {
        heuristic_calls++
        score = boardScore(board);
        if (!(level === maxLevel ||
          score === MIN_SCORE||
          score === MAX_SCORE)) {
          let nextPlayer = player === '1' ? '2' : '1';
          score = minMax(board, player0, nextPlayer, level + 1, maxLevel, alpha, beta, cache, available).score;
        }
        // Cache this score
        cache[cacheKey] = score;
      }

       board[action[0]][action[1]] = 0;

       if (level % 2 == 1) {
        if (score < bestScore) {
          bestScore = score;
          bestMove = action;
          if (score < beta)
            beta = score;
        }
      } else {
        if (score > bestScore) {
          bestScore = score;
          bestMove = action;
          if (score > alpha)
            alpha = score;
        }
      }
      available[i] = move;
      // Alpha beta prune
      if (alpha >= beta) {
        break;
      }
    }
  }
  //console.log('heuristic_calls: '+heuristic_calls.toString())

  return { score: bestScore, move: bestMove };
}

 module.exports = minMax;

 function getHash(board) {
  let hash = '';
  board.forEach(row => {
    row.forEach(cell => {
      hash += cell;
    });
  });
  return hash;
}

 /**
 * Get the candidates hex to be evaluated by the minMax. Not all the empty hex are really 
 * interesting. We will consider only the neighbours of the occupied hex at max distance of 2 
 * @param {} board 
 */
function getCandidates(board) {
  let size = board.length;
  let boardT = new Array(size);
  for (let i = 0; i < size; i++) {
    boardT[i] = board[i].slice();
  }

   for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (boardT[i][j] === '1' || boardT[i][j] === '2') {
        markAdyacentCells(boardT, i, j, 1);
      } else if (boardT[i][j] === 1) {
        markAdyacentCells(boardT, i, j, 2);
      }
    }
  }

   let candidates = [];
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (boardT[i][j] === 1 || boardT[i][j] === 2) {
        candidates.push(i * size + j);
      }
    }
  }
  return candidates;
}

 /**
 * Change the adyacent cells by the current value if they are empty
 * @param {} board 
 * @param {*} row 
 * @param {*} col 
 * @param {*} value 
 */
function markAdyacentCells(board, row, col, value) {
  changeIfNeeded(board, row - 1, col, value);
  changeIfNeeded(board, row - 1, col + 1, value);
  changeIfNeeded(board, row, col + 1, value);
  changeIfNeeded(board, row, col - 1, value);
  changeIfNeeded(board, row + 1, col, value);
  changeIfNeeded(board, row + 1, col - 1, value);
  changeIfNeeded(board, row + 1, col + 1, value);
  changeIfNeeded(board, row - 1, col - 1, value);
}

 /**
 * Change the current hex if it is valid and empty
 * @param {} board 
 * @param {*} row 
 * @param {*} col 
 * @param {*} value 
 */
function changeIfNeeded(board, row, col, value) {
  let size = board.length;
  if (row >= 0 && row < size && col >= 0 && col < size) {
    if (board[row][col] === 0) {
      board[row][col] = value;
    }
  }
}

 /*
let board = [[0, 0, 0],
[0, 0, 0],
['1', 0, 0]];
console.log(minMax(board, '2', '2', 0, 2, Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, {}));  
// Debe dar 3 - 1 = 2 */

},{"./boardScore":7,"./getEmptyHex":8,"./transposeHex":10}],10:[function(require,module,exports){
/**
 * Transpose and convert the board game to a player 1 logic
 * @param {Array} board 
 */
function transpose(board) {
  let size = board.length;
  let boardT = new Array(size);
  for (let j = 0; j < size; j++) {
      boardT[j] = new Array(size);
      for (let i = 0; i < size; i++) {
          boardT[j][i] = board[i][j];
          if (boardT[j][i] === '1') {
              boardT[j][i] = '2';
          } else if (boardT[j][i] === '2') {
              boardT[j][i] = '1';
          }
      }
  }
  return boardT;
}

module.exports = transpose;
},{}]},{},[]);
