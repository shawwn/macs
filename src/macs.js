let mout = require('mout')
let Case = require('change-case');
let G = mout.lang.GLOBAL;
let ns = (name, G=mout.lang.GLOBAL) => { mout.object.namespace(G, name); return mout.object.get(G, name); }

let el_globals = require('./globals');

let el;
if (!G.hasOwnProperty('el')) {
  el = ns('el');
  el.env = el.env || {DEFINE_KEY_OPS_AS_MACROS: process.env.DEFINE_KEY_OPS_AS_MACROS || true};
  el_init(el);
} else {
  el = ns('el');
}

  
// #if CHECK_LISP_OBJECT_TYPE
// # define lisp_h_XLI(o) ((o).i)
// # define lisp_h_XIL(i) ((Lisp_Object) { i })
// #else
// # define lisp_h_XLI(o) (o)
// # define lisp_h_XIL(i) (i)
// #endif
// #define lisp_h_CHECK_LIST_CONS(x, y) CHECK_TYPE (CONSP (x), Qlistp, y)
// #define lisp_h_CHECK_NUMBER(x) CHECK_TYPE (INTEGERP (x), Qintegerp, x)
// #define lisp_h_CHECK_SYMBOL(x) CHECK_TYPE (SYMBOLP (x), Qsymbolp, x)
// #define lisp_h_CHECK_TYPE(ok, predicate, x) \
  //  ((ok) ? (void) 0 : (void) wrong_type_argument (predicate, x))
// #define lisp_h_CONSP(x) (XTYPE (x) === Lisp_Cons)
// #define lisp_h_EQ(x, y) (XLI (x) === XLI (y))
// #define lisp_h_FLOATP(x) (XTYPE (x) === Lisp_Float)
// #define lisp_h_INTEGERP(x) ((XTYPE (x) & (Lisp_Int0 | ~Lisp_Int1)) === Lisp_Int0)
// #define lisp_h_MARKERP(x) (MISCP (x) && XMISCTYPE (x) === Lisp_Misc_Marker)
// #define lisp_h_MISCP(x) (XTYPE (x) === Lisp_Misc)
// #define lisp_h_NILP(x) EQ (x, Qnil)
// #define lisp_h_SET_SYMBOL_VAL(sym, v) \
  //  (eassert ((sym)->redirect === SYMBOL_PLAINVAL), (sym)->val.value = (v))
// #define lisp_h_SYMBOL_CONSTANT_P(sym) (XSYMBOL (sym)->constant)
// #define lisp_h_SYMBOL_VAL(sym) \
  //  (eassert ((sym)->redirect === SYMBOL_PLAINVAL), (sym)->val.value)
// #define lisp_h_SYMBOLP(x) (XTYPE (x) === Lisp_Symbol)
// #define lisp_h_VECTORLIKEP(x) (XTYPE (x) === Lisp_Vectorlike)
// #define lisp_h_XCAR(c) XCONS (c)->car
// #define lisp_h_XCDR(c) XCONS (c)->u.cdr
// #define lisp_h_XCONS(a) \
  //  (eassert (CONSP (a)), (struct Lisp_Cons *) XUNTAG (a, Lisp_Cons))
// #define lisp_h_XHASH(a) XUINT (a)
// #define lisp_h_XPNTR(a) \
  //  (SYMBOLP (a) ? XSYMBOL (a) : (void *) ((intptr_t) (XLI (a) & VALMASK)))
// #ifndef GC_CHECK_CONS_LIST
// # define lisp_h_check_cons_list() ((void) 0)
// #endif
// #if USE_LSB_TAG
// # define lisp_h_make_number(n) \
  //   XIL ((EMACS_INT) (((EMACS_UINT) (n) << INTTYPEBITS) + Lisp_Int0))
// # define lisp_h_XFASTINT(a) XINT (a)
// # define lisp_h_XINT(a) (XLI (a) >> INTTYPEBITS)
// # define lisp_h_XSYMBOL(a) \
  //   (eassert (SYMBOLP (a)), \
  //    (struct Lisp_Symbol *) ((uintptr_t) XLI (a) - Lisp_Symbol \
			     // + (char *) lispsym))
// # define lisp_h_XTYPE(a) ((enum Lisp_Type) (XLI (a) & ~VALMASK))
// # define lisp_h_XUNTAG(a, type) ((void *) (intptr_t) (XLI (a) - (type)))
// #endif


function el_init(el) {
  // ns('el.Q');
  // ns('el.F');
  // ns('el.V');
  // ns('el.P');
  el.GCTYPEBITS = 3

  el.EMACS_INT_MAX = ~(1<<31);
  el.EMACS_INT_WIDTH = 31;

  /***** Select the tagging scheme.  *****/
/* The following option controls the tagging scheme:
   - USE_LSB_TAG means that we can assume the least 3 bits of pointers are
     always 0, and we can thus use them to hold tag bits, without
     restricting our addressing space.

   If ! USE_LSB_TAG, then use the top 3 bits for tagging, thus
   restricting our possible address range.

   USE_LSB_TAG not only requires the least 3 bits of pointers returned by
   malloc to be 0 but also needs to be able to impose a mult-of-8 alignment
   on the few static Lisp_Objects used: lispsym, all the defsubr, and
   the two special buffers buffer_defaults and buffer_local_symbols.  */

    /* 2**GCTYPEBITS.  This must be a macro that expands to a literal
       integer constant, for MSVC.  */
    el.GCALIGNMENT = 8;

    /* Number of bits in a Lisp_Object value, not counting the tag.  */
    el.VALBITS = el.EMACS_INT_WIDTH - el.GCTYPEBITS;

    /* Number of bits in a Lisp fixnum tag.  */
    el.INTTYPEBITS = el.GCTYPEBITS - 1;

    /* Number of bits in a Lisp fixnum value, not counting the tag.  */
    el.FIXNUM_BITS = el.VALBITS + 1;

    el.Lisp_Bits = {GCALIGNMENT: el.GCALIGNMENT,
      VALBITS: el.VALBITS,
      INTTYPEBITS: el.INTTYPEBITS,
      FIXNUMBITS: el.FIXNUMBITS}
    
/* The maximum value that can be stored in a EMACS_INT, assuming all
   bits other than the type bits contribute to a nonnegative signed value.
   This can be used in #if, e.g., '#if USE_LSB_TAG' below expands to an
   expression involving VAL_MAX.  */
el.VAL_MAX = (el.EMACS_INT_MAX >> (el.GCTYPEBITS - 1))
el.VALMASK = (el.env.USE_LSB_TAG ? - (1 << el.GCTYPEBITS) : el.VAL_MAX)


el.Lisp_Type =
  {
    /* Symbol.  XSYMBOL (object) points to a struct Lisp_Symbol.  */
    Lisp_Symbol: 0,

    /* Miscellaneous.  XMISC (object) points to a union Lisp_Misc,
       whose first member indicates the subtype.  */
    Lisp_Misc: 1,

    /* Integer.  XINT (obj) is the integer value.  */
    Lisp_Int0: 2,
    Lisp_Int1: el.env.USE_LSB_TAG ? 6 : 3,

    /* String.  XSTRING (object) points to a struct Lisp_String.
       The length of the string, and its contents, are stored therein.  */
    Lisp_String: 4,

    /* Vector of Lisp objects, or something resembling it.
       XVECTOR (object) points to a struct Lisp_Vector, which contains
       the size and contents.  The size field also contains the type
       information, if it's not a real vector object.  */
    Lisp_Vectorlike: 5,

    /* Cons.  XCONS (object) points to a struct Lisp_Cons.  */
    Lisp_Cons: el.env.USE_LSB_TAG ? 3 : 6,

    Lisp_Float: 7,
    Lisp_Max: 8
  };
Object.assign(el, el.Lisp_Type);
  


  Object.defineProperty(global, '__stack', {
    get: function(){
      var orig = Error.prepareStackTrace;
      Error.prepareStackTrace = function(_, stack){ return stack; };
      var err = new Error;
      Error.captureStackTrace(err, arguments.callee);
      var stack = err.stack;
      Error.prepareStackTrace = orig;
      return stack;
    }
  });

  Object.defineProperty(global, '__line', {
    get: function(){
      return __stack[1].getLineNumber();
    }
  });

  el.eassert = function eassert(cond, name) {
    if (!cond()) {
      console.error("assertion failed: " + cond.toString());
      process.exit(1);
    }
  }
    

  el.INTERN = function intern(name) {
    let k = el.KEY(name);
    if (!el.hasOwnProperty(k)) {
      el.DEFSYM(k, name);
    }
    return el[k];
  }

  el.KEY = function el_str2sym(name, type='Q') {
    return `${type}${Case.snakeCase(name)}`;
  }

  el.SYMS = [];

  el.make_symbol = function make_symbol(name, idx) {
    // if (idx === null) {
    //   idx = el.SYMS.length;
    // }
    let sym = {type: el.KEY("symbol"), name: name, plist: {}}
    if (idx != null) {
      el.SYMS[idx] = sym;
    }
    return sym;
  }

  el.DEFSYM = function defsym(sym, name) {
    el[sym] = el.make_symbol(name);
  }

  el.DEFUN2 = function defun(f) {
    let name = Case.paramCase(f.name);
    let key = el.KEY(f.name, 'F')
    let sym = el.KEY(f.name, 'Q')
    el[key] = f;
    el.INTERN(name).f = key;
    return f;
  }

  // #define DEFUN(lname, fnname, sname, minargs, maxargs, intspec, doc)	\
  //  static struct Lisp_Subr alignas (GCALIGNMENT) sname =		\
  //    { { PVEC_SUBR << PSEUDOVECTOR_AREA_BITS },				\
  //      { .a ## maxargs = fnname },					\
  //      minargs, maxargs, lname, intspec, 0};				\
  //  Lisp_Object fnname
// #endif

  el.DEFUN = function defun(lname, fnname, sname, minargs, maxargs, intspec, attrs, subr) {
    if (typeof attrs === 'string') {
      attrs = {doc: attrs}
    }
    el[fnname] = subr;
    el[sname] = Object.assign({}, {minargs, maxargs, intspec, fnname, lname, ['a'+maxargs]: subr}, attrs);
  }

  with_init(el);
  el_globals(el);
  syms_of_data(el);
  return el;
}

function with_init(el) {
  with (el) {
    if (el.env.DEFINE_KEY_OPS_AS_MACROS) {
      el.XLI = function XLI (o) { return el.lisp_h_XLI (o) }
      el.XIL = function XIL (i) { return el.lisp_h_XIL (i) }
      el.CHECK_NUMBER = function CHECK_NUMBER (x) { return el.lisp_h_CHECK_NUMBER (x); }
      el.CHECK_SYMBOL = function CHECK_SYMBOL (x) { return el.lisp_h_CHECK_SYMBOL (x); }
      el.CHECK_TYPE = function CHECK_TYPE (ok, predicate, x) { return el.lisp_h_CHECK_TYPE (ok, predicate, x); }
      el.CONSP = function CONSP (x) { return el.lisp_h_CONSP (x); }
      el.EQ = function EQ (x, y) { return el.lisp_h_EQ (x, y); }
      el.FLOATP  = function FLOATP (x) { return el.lisp_h_FLOATP (x); }
      el.INTEGERP  = function INTEGERP (x) { return el.lisp_h_INTEGERP (x); }
      el.MARKERP  = function MARKERP (x) { return el.lisp_h_MARKERP (x); }
      el.MISCP  = function MISCP (x) { return el.lisp_h_MISCP (x); }
      el.NILP  = function NILP (x) { return el.lisp_h_NILP (x); }
      el.SET_SYMBOL_VAL  = function SET_SYMBOL_VAL (sym, v) { return el.lisp_h_SET_SYMBOL_VAL (sym, v); }
      el.SYMBOL_CONSTANT_P  = function SYMBOL_CONSTANT_P (sym) { return el.lisp_h_SYMBOL_CONSTANT_P (sym); }
      el.SYMBOL_TRAPPED_WRITE_P  = function SYMBOL_TRAPPED_WRITE_P (sym) { return el.lisp_h_SYMBOL_TRAPPED_WRITE_P (sym); }
      el.SYMBOL_VAL  = function SYMBOL_VAL (sym) { return el.lisp_h_SYMBOL_VAL (sym); }
      el.SYMBOLP  = function SYMBOLP (x) { return el.lisp_h_SYMBOLP (x); }
      el.VECTORLIKEP  = function VECTORLIKEP (x) { return el.lisp_h_VECTORLIKEP (x); }
      el.XCAR  = function XCAR (c) { return el.lisp_h_XCAR (c); }
      el.XCDR  = function XCDR (c) { return el.lisp_h_XCDR (c); }
      el.XCONS  = function XCONS (a) { return el.lisp_h_XCONS (a); }
      el.XHASH  = function XHASH (a) { return el.lisp_h_XHASH (a); }
      if (!el.env.GC_CHECK_CONS_LIST) {
        el.check_cons_list = function check_cons_list () { return el.lisp_h_check_cons_list (); }
      }
      if (el.env.USE_LSB_TAG) {
        el.make_number = function make_number (n) { return el.lisp_h_make_number (n); }
        el.XFASTINT = function XFASTINT (a) { return el.lisp_h_XFASTINT (a); }
        el.XINT = function XINT (a) { return el.lisp_h_XINT (a); }
        el.XSYMBOL = function XSYMBOL (a) { return el.lisp_h_XSYMBOL (a); }
        el.XTYPE = function XTYPE (a) { return el.lisp_h_XTYPE (a); }
        el.XUNTAG = function XUNTAG (a, type) { return el.lisp_h_XUNTAG (a, type); }
      }
    }


    // el.lisp_h_XLI = function lisp_h_XLI(o) { return (o.index != null) ? o.index : o; }
    // el.lisp_h_XIL = function lisp_h_XIL(i) { return Lisp_Object(i); }
    el.lisp_h_XLI = function lisp_h_XLI(o) { return o; }
    el.lisp_h_XIL = function lisp_h_XIL(i) { return i; }
    el.lisp_h_CHECK_LIST_CONS = function lisp_h_CHECK_LIST_CONS(x, y) { return CHECK_TYPE (CONSP (x), Qlistp, y) }
    el.lisp_h_CHECK_NUMBER = function lisp_h_CHECK_NUMBER(x) { return CHECK_TYPE (INTEGERP (x), Qintegerp, x) }
    el.lisp_h_CHECK_SYMBOL = function lisp_h_CHECK_SYMBOL(x) { return CHECK_TYPE (SYMBOLP (x), Qsymbolp, x) }
    el.lisp_h_CHECK_TYPE = function lisp_h_CHECK_TYPE(ok, predicate, x) {
       return ((ok) ? 0 : el.wrong_type_argument (predicate, x))
    }
    el.lisp_h_CONSP = function lisp_h_CONSP(x) { return (XTYPE (x) === Lisp_Cons); }
    el.lisp_h_EQ = function lisp_h_EQ(x, y) { return (XLI (x) === XLI (y)); }
    el.lisp_h_FLOATP = function lisp_h_FLOATP(x) { return (XTYPE (x) === Lisp_Float); }
    el.lisp_h_INTEGERP = function lisp_h_INTEGERP(x) { return ((XTYPE (x) & (Lisp_Int0 | ~Lisp_Int1)) === Lisp_Int0); }
    el.lisp_h_MARKERP = function lisp_h_MARKERP(x) { return (MISCP (x) && XMISCTYPE (x) === Lisp_Misc_Marker); }
    el.lisp_h_MISCP = function lisp_h_MISCP(x) { return (XTYPE (x) === Lisp_Misc); }
    el.lisp_h_NILP = function lisp_h_NILP(x) { return EQ (x, Qnil); }
    el.lisp_h_SET_SYMBOL_VAL = function lisp_h_SET_SYMBOL_VAL(sym, v) {
       return eassert (() => (sym)["->redirect"] === SYMBOL_PLAINVAL), (sym)["->val"].value = (v)
    }
    el.lisp_h_SYMBOL_CONSTANT_P = function lisp_h_SYMBOL_CONSTANT_P(sym) { return (XSYMBOL (sym)["->constant"]); }
    el.lisp_h_SYMBOL_VAL = function lisp_h_SYMBOL_VAL(sym) { 
      return (eassert (() => (sym)["->redirect"] === SYMBOL_PLAINVAL), (sym)["->val"].value); }
    el.lisp_h_SYMBOLP = function lisp_h_SYMBOLP(x) { return (XTYPE (x) === Lisp_Symbol); }
    el.lisp_h_VECTORLIKEP = function lisp_h_VECTORLIKEP(x) { return (XTYPE (x) === Lisp_Vectorlike); }
    // el.lisp_h_XCAR = function lisp_h_XCAR(c) { return XCONS (c)["->car"]; }
    // el.lisp_h_XCDR = function lisp_h_XCDR(c) { return XCONS (c)["->u"].cdr; }
    el.lisp_h_XCAR = function lisp_h_XCAR(c) { return XCONS (c).car; }
    el.lisp_h_XCDR = function lisp_h_XCDR(c) { return XCONS (c).cdr; }
    el.lisp_h_XCONS = function lisp_h_XCONS(a) {
       // return (eassert (() => CONSP (a)), /*(struct Lisp_Cons *)*/ XUNTAG (a, Lisp_Cons))
       return (eassert (() => CONSP (a)), el.Lisp_Object(a));
    }
    el.lisp_h_XHASH = function lisp_h_XHASH(a) { return XUINT (a) }
    el.lisp_h_XPNTR = function lisp_h_XPNTR(a) {
       return (SYMBOLP (a) ? XSYMBOL (a) : /*(void *)*/ (/*(intptr_t)*/ (XLI (a) & VALMASK)));
    }
    if (el.env.GC_CHECK_CONS_LIST) {
      el.lisp_h_check_cons_list = function lisp_h_check_cons_list() { return (/*(void)*/ 0) }
    }
    if (el.env.USE_LSB_TAG) {
      el.lisp_h_make_number = function lisp_h_make_number(n) {
        return XIL ((EMACS_INT) (((EMACS_UINT) (n) << INTTYPEBITS) + Lisp_Int0))
      }
      el.lisp_h_XFASTINT = function lisp_h_XFASTINT(a) { return XINT (a) }
      el.lisp_h_XINT = function lisp_h_XINT(a) { return (XLI (a) >> INTTYPEBITS) }
      el.lisp_h_XSYMBOL = function lisp_h_XSYMBOL(a) {
        return (eassert (() => SYMBOLP (a)), 
            /*(struct Lisp_Symbol *)*/ (/*(uintptr_t)*/ XLI (a) - Lisp_Symbol 
              + /*(char *)*/ lispsym))
      }
      el.lisp_h_XTYPE = function lisp_h_XTYPE(a) { return (/*(enum Lisp_Type)*/ (XLI (a) & ~VALMASK)) }
      el.lisp_h_XUNTAG = function lisp_h_XUNTAG(a, type) { return (/*(void *)*/ /*(intptr_t)*/ (XLI (a) - (type))) }
    }

      /* Low-level conversion and type checking.  */

      /* Convert a Lisp_Object to the corresponding EMACS_INT and vice versa.
         At the machine level, these operations are no-ops.  */

      //INLINE EMACS_INT
      el.XLI = function XLI (/*Lisp_Object*/ o)
      {
        return el.lisp_h_XLI (o);
      }

      //INLINE Lisp_Object
      el.XIL = function XIL (/*EMACS_INT*/ i)
      {
        return el.lisp_h_XIL (i);
      }

      /* Extract A's type.  */

      //INLINE enum Lisp_Type
      el.XTYPE = function XTYPE (/*Lisp_Object*/ a)
      {
        if (el.env.USE_LSB_TAG) {
          return el.lisp_h_XTYPE (a);
        } else {
          let /*EMACS_UINT*/ i = XLI (a);
          return el.env.USE_LSB_TAG ? i & ~el.VALMASK : i >> el.VALBITS;
        }
      }

      //INLINE void
      el.CHECK_TYPE = function CHECK_TYPE (/*int*/ ok, /*Lisp_Object*/ predicate, /*Lisp_Object*/ x)
      {
        el.lisp_h_CHECK_TYPE (ok, predicate, x);
      }

      /* Extract A's pointer value, assuming A's type is TYPE.  */

      //INLINE void *
      el.XUNTAG = function XUNTAG (/*Lisp_Object*/ a, /*int*/ type)
      {
        if (el.env.USE_LSB_TAG) {
          return el.lisp_h_XUNTAG (a, type);
        } else {
          let /*intptr_t*/ i = el.env.USE_LSB_TAG ? el.XLI (a) - type : el.XLI (a) & el.VALMASK;
          return /*(void *)*/ i;
          // if (type === el.Lisp_Symbol) {
          //   return el.lispsym[i];
          // } else {
          //   throw new Error("Can't untag type");
          // }
        }
      }

      /* Yield a signed integer that contains TAG along with PTR.

         Sign-extend pointers when USE_LSB_TAG (this simplifies emacs-module.c),
         and zero-extend otherwise (that’s a bit faster here).
         Sign extension matters only when EMACS_INT is wider than a pointer.  */
      el.TAG_PTR = function TAG_PTR (tag, ptr) {
        return el.env.USE_LSB_TAG 
         ? /*(intptr_t)*/ (ptr) + (tag) 
         : /*(EMACS_INT)*/ ((/*(EMACS_UINT)*/ (tag) << el.VALBITS) + /*(uintptr_t)*/ (ptr));

      }

    
      /* Yield an integer that contains a symbol tag along with OFFSET.
         OFFSET should be the offset in bytes from 'lispsym' to the symbol.  */
      el.TAG_SYMOFFSET = function TAG_SYMOFFSET (offset) { 
        return el.TAG_PTR (el.Lisp_Symbol, offset);
      }

      el.heap = new Array(el.Lisp_Max);
      for (let i = 0; i < el.Lisp_Max; i++) {
        el.heap[i] = new Array(2048);
      }
      // el.heap[el.Lisp_Symbol] = el.lispsym;
      // el.lispsym = el.heap[el.Lisp_Symbol];
      el.lispsym = 0;

el.Lisp_Object = function Lisp_Object(ptr) {
  let type = el.XTYPE(ptr);
  let tag = el.XUNTAG(ptr, type);
  // eassert(() => el.heap[ptr]);
  el.eassert(() => tag < el.heap[type].length);
  let obj = el.heap[type][tag];
  if (obj == null) {
    el.heap[type][tag] = obj = {}
  }
  // return el.heap[type][tag];
  // return el.heap[ptr];
  return obj;
}


/* Construct a Lisp_Object from a value or address.  */

// INLINE Lisp_Object
el.make_lisp_ptr = function make_lisp_ptr (/*void **/ ptr, /*enum Lisp_Type*/ type)
{
  let /*Lisp_Object*/ a = el.XIL (el.TAG_PTR (type, ptr));
  el.eassert (() => (el.XTYPE (a) === type && el.XUNTAG (a, type) === ptr));
  return a;
}


/* Like malloc but used for allocating Lisp data.  NBYTES is the
   number of bytes to allocate, TYPE describes the intended use of the
   allocated memory block (for strings, for conses, ...).  */

if (!el.env.USE_LSB_TAG) {
// void *lisp_malloc_loser EXTERNALLY_VISIBLE;
}




// INLINE bool
el.SYMBOLP = function SYMBOLP (/*Lisp_Object*/ x)
{
  return el.lisp_h_SYMBOLP (x);
}

// INLINE struct Lisp_Symbol *
el.XSYMBOL = function XSYMBOL (/*Lisp_Object*/ a)
{
  if (el.env.USE_LSB_TAG) {
    return el.lisp_h_XSYMBOL (a);
  } else {
    el.eassert (() => el.SYMBOLP (a));
    let /*intptr_t*/ i = /*(intptr_t)*/ el.XUNTAG (a, el.Lisp_Symbol);
    let /* void * */ p = /*(char *)*/ el.lispsym + i;
    return p;
  }
}

// INLINE Lisp_Object
el.make_lisp_symbol = function make_lisp_symbol(/* Lisp_Symbol * */ sym)
{
  let /*Lisp_Object*/ a = el.XIL (el.TAG_SYMOFFSET (/*(char *)*/ sym - /*(char *)*/ el.lispsym));
  el.eassert (() => el.XSYMBOL (a) === sym);
  return a;
}

// INLINE Lisp_Object
el.builtin_lisp_symbol = function builtin_lisp_symbol(/*int*/ index)
{
  return el.make_lisp_symbol (el.lispsym + index);
}

// INLINE void
el.CHECK_SYMBOL = function CHECK_SYMBOL (/*Lisp_Object*/ x)
{
  return el.lisp_h_CHECK_SYMBOL (x);
}



/* When scanning the C stack for live Lisp objects, Emacs keeps track of
   what memory allocated via lisp_malloc and lisp_align_malloc is intended
   for what purpose.  This enumeration specifies the type of memory.  */

el.mem_type =
{
  MEM_TYPE_NON_LISP: 0,
  MEM_TYPE_BUFFER: 1,
  MEM_TYPE_CONS: 2,
  MEM_TYPE_STRING: 3,
  MEM_TYPE_MISC: 4,
  MEM_TYPE_SYMBOL: 5,
  MEM_TYPE_FLOAT: 6,
  /* Since all non-bool pseudovectors are small enough to be
     allocated from vector blocks, this memory type denotes
     large regular vectors and large bool pseudovectors.  */
  MEM_TYPE_VECTORLIKE: 7,
  /* Special type to denote vector blocks.  */
  MEM_TYPE_VECTOR_BLOCK: 8,
  /* Special type to denote reserved memory.  */
  MEM_TYPE_SPARE: 9,
  MEM_TYPE_MAX: 10
};
Object.assign(el, el.mem_type);

/* A unique object in pure space used to make some Lisp objects
   on free lists recognizable in O(1).  */

// static Lisp_Object Vdead;
el.Vdead = el.Vdead || {}
// #define DEADP(x) EQ (x, Vdead)
el.DEADP = function DEADP(x) { return EQ(x, Vdead); }

// #ifdef GC_MALLOC_CHECK

// enum mem_type allocated_mem_type;

// #endif /* GC_MALLOC_CHECK */


// static void *
el.lisp_malloc = function lisp_malloc(/*size_t*/ nbytes, /*enum mem_type*/ type)
{
  // register void *val;
  let val;

  // MALLOC_BLOCK_INPUT;

// #ifdef GC_MALLOC_CHECK
//   allocated_mem_type = type;
// #endif

  val = lmalloc (nbytes);

if (! el.env.USE_LSB_TAG) {
  /* If the memory just allocated cannot be addressed thru a Lisp
     object's pointer, and it needs to be,
     that's equivalent to running out of memory.  */
  if (val && type != MEM_TYPE_NON_LISP)
    {
      /*Lisp_Object*/ tem;
      tem = el.XSETCONS (tem, /*(char *)*/ val + nbytes - 1);
      if (/*(char *)*/ XCONS (tem) != /*(char *)*/ val + nbytes - 1)
	{
	  lisp_malloc_loser = val;
	  free (val);
	  val = 0;
	}
    }
}

if (! el.env.GC_MALLOC_CHECK) {
  if (val && type != MEM_TYPE_NON_LISP)
    mem_insert (val, /*(char *)*/ val + nbytes, type);
}

  MALLOC_UNBLOCK_INPUT;
  if (!val && nbytes)
    memory_full (nbytes);
  MALLOC_PROBE (nbytes);
  return val;
}

/* Free BLOCK.  This must be called to free memory allocated with a
   call to lisp_malloc.  */

// static void
el.lisp_free = function lisp_free(/* void * */ block)
{
  MALLOC_BLOCK_INPUT;
  free (block);
if (! el.env.GC_MALLOC_CHECK) {
  mem_delete (mem_find (block));
}
  MALLOC_UNBLOCK_INPUT;
}




if (!el.env.USE_LSB_TAG) {

/* Although compiled only if ! USE_LSB_TAG, the following functions
   also work when USE_LSB_TAG; this is to aid future maintenance when
   the lisp_h_* macros are eventually removed.  */

/* Make a Lisp integer representing the value of the low order
   bits of N.  */
// INLINE Lisp_Object
el.make_number = function make_number (/*EMACS_INT*/ n)
{
  let /*EMACS_INT*/ int0 = el.Lisp_Int0;
  if (el.env.USE_LSB_TAG)
    {
      let /*EMACS_UINT*/ u = n;
      n = u << el.INTTYPEBITS;
      n += int0;
    }
  else
    {
      n &= el.INTMASK;
      n += (int0 << el.VALBITS);
    }
  return el.XIL (n);
}

/* Extract A's value as a signed integer.  */
// INLINE EMACS_INT
el.XINT = function XINT (/*Lisp_Object*/ a)
{
  let /*EMACS_INT*/ i = el.XLI (a);
  if (! el.env.USE_LSB_TAG)
    {
      /*EMACS_UINT*/ u = i;
      i = u << el.INTTYPEBITS;
    }
  return i >> el.INTTYPEBITS;
}

/* Like XINT (A), but may be faster.  A must be nonnegative.
   If ! USE_LSB_TAG, this takes advantage of the fact that Lisp
   integers have zero-bits in their tags.  */
// INLINE EMACS_INT
el.XFASTINT = function XFASTINT (/*Lisp_Object*/ a)
{
  let /*EMACS_INT*/ int0 = el.Lisp_Int0;
  let /*EMACS_INT*/ n = el.env.USE_LSB_TAG ? el.XINT (a) : el.XLI (a) - (int0 << el.VALBITS);
  el.eassume (0 <= n);
  return n;
}

}

// INLINE bool
el.INTEGERP = function INTEGERP (/*Lisp_Object*/ x)
{
  return el.lisp_h_INTEGERP (x);
}

el.XSETINT = function XSETINT (a, b) { return ((a) = el.make_number (b)); }
el.XSETFASTINT = function XSETFASTINT (a, b) { return ((a) = el.make_natnum (b)); }
el.XSETCONS = function XSETCONS (a, b) { return ((a) = el.make_lisp_ptr (b, el.Lisp_Cons)); }
el.XSETVECTOR = function XSETVECTOR (a, b) { return ((a) = el.make_lisp_ptr (b, el.Lisp_Vectorlike)); }
el.XSETSTRING = function XSETSTRING (a, b) { return ((a) = el.make_lisp_ptr (b, el.Lisp_String)); }
el.XSETSYMBOL = function XSETSYMBOL (a, b) { return ((a) = el.make_lisp_symbol (b)); }
el.XSETFLOAT = function XSETFLOAT (a, b) { return ((a) = el.make_lisp_ptr (b, el.Lisp_Float)); }
el.XSETMISC = function XSETMISC (a, b) { return ((a) = el.make_lisp_ptr (b, el.Lisp_Misc)); }





/* Take the car or cdr of something known to be a cons cell.  */
/* The _addr functions shouldn't be used outside of the minimal set
   of code that has to know what a cons cell looks like.  Other code not
   part of the basic lisp implementation should assume that the car and cdr
   fields are not accessible.  (What if we want to switch to
   a copying collector someday?  Cached cons cell field addresses may be
   invalidated at arbitrary points.)  */
// INLINE /*Lisp_Object*/ *
el.xcar_addr = function xcar_addr (/*Lisp_Object*/ c)
{
  // return &el.XCONS (c)->car;
  // TODO
  return el.Lisp_Object(c);
}
// INLINE /*Lisp_Object*/ *
el.xcdr_addr = function xcdr_addr (/*Lisp_Object*/ c)
{
  // return &el.XCONS (c)->u.cdr;
  // TODO
  return el.Lisp_Object(c);
}

/* Use these from normal code.  */

// INLINE /*Lisp_Object*/
el.XCAR = function XCAR (/*Lisp_Object*/ c)
{
  return el.lisp_h_XCAR (c);
}

// INLINE /*Lisp_Object*/
el.XCDR = function XCDR (/*Lisp_Object*/ c)
{
  return el.lisp_h_XCDR (c);
}

/* Use these to set the fields of a cons cell.

   Note that both arguments may refer to the same object, so 'n'
   should not be read after 'c' is first modified.  */
// INLINE void
el.XSETCAR = function XSETCAR (/*Lisp_Object*/ c, /*Lisp_Object*/ n)
{
  // *el.xcar_addr (c) = n;
  // TODO
  return el.xcar_addr (c).car = n;
}
// INLINE void
el.XSETCDR = function XSETCDR (/*Lisp_Object*/ c, /*Lisp_Object*/ n)
{
  // *el.xcdr_addr (c) = n;
  // TODO
  return el.xcar_addr (c).cdr = n;
}

/* Take the car or cdr of something whose type is not known.  */
// INLINE /*Lisp_Object*/
el.CAR = function CAR (/*Lisp_Object*/ c)
{
  if (el.CONSP (c))
    return el.XCAR (c);
  if (!el.NILP (c))
    el.wrong_type_argument (el.Qlistp, c);
  return el.Qnil;
}
// INLINE /*Lisp_Object*/
el.CDR = function CDR (/*Lisp_Object*/ c)
{
  if (el.CONSP (c))
    return el.XCDR (c);
  if (!el.NILP (c))
    el.wrong_type_argument (el.Qlistp, c);
  return el.Qnil;
}

/* Take the car or cdr of something whose type is not known.  */
// INLINE /*Lisp_Object*/
el.CAR_SAFE = function CAR_SAFE (/*Lisp_Object*/ c)
{
  return el.CONSP (c) ? el.XCAR (c) : el.Qnil;
}
// INLINE /*Lisp_Object*/
el.CDR_SAFE = function CDR_SAFE (/*Lisp_Object*/ c)
{
  return el.CONSP (c) ? el.XCDR (c) : el.Qnil;
}



      /* In a string or vector, the sign bit of the `size' is the gc mark bit.  */

// struct GCALIGNED Lisp_String
//   {
//     ptrdiff_t size;
//     ptrdiff_t size_byte;
//     INTERVAL intervals;		/* Text properties in this string.  */
//     unsigned char *data;
//   };

// INLINE bool
el.STRINGP = function STRINGP(/*Lisp_Object*/ x)
{
  return el.XTYPE (x) === el.Lisp_String;
}

// INLINE void
el.CHECK_STRING = function CHECK_STRING(/*Lisp_Object*/ x)
{
  el.CHECK_TYPE (el.STRINGP (x), el.Qstringp, x);
}

// INLINE struct Lisp_String *
el.XSTRING = function XSTRING(/*Lisp_Object*/ a)
{
  el.eassert (() => el.STRINGP (a));
  // return el.XUNTAG (a, el.Lisp_String);
  return el.Lisp_Object (a);
}

// _Noreturn void
el.wrong_type_argument = function wrong_type_argument (/*register*/ /*Lisp_Object*/ predicate, /*register*/ /*Lisp_Object*/ value)
{
  /* If VALUE is not even a valid Lisp object, we'd want to abort here
     where we can get a backtrace showing where it came from.  We used
     to try and do that by checking the tagbits, but nowadays all
     tagbits are potentially valid.  */
  /* if ((unsigned int) XTYPE (value) >= Lisp_Type_Limit)
   *   emacs_abort (); */

  el.xsignal2 (el.Qwrong_type_argument, predicate, value);
}

// INLINE _Noreturn void
el.xsignal = function xsignal (/*Lisp_Object*/ error_symbol, /*Lisp_Object*/ data)
{
  el.Fsignal (error_symbol, data);
}

/* Like xsignal, but takes 0, 1, 2, or 3 args instead of a list.  */

// void
el.xsignal0 = function xsignal0 (/*Lisp_Object*/ error_symbol)
{
  el.xsignal (error_symbol, el.Qnil);
}

// void
el.xsignal1 = function xsignal1 (/*Lisp_Object*/ error_symbol, /*Lisp_Object*/ arg)
{
  el.xsignal (error_symbol, el.list1 (arg));
}

// void
el.xsignal2 = function xsignal2 (/*Lisp_Object*/ error_symbol, /*Lisp_Object*/ arg1, /*Lisp_Object*/ arg2)
{
  el.xsignal (error_symbol, el.list2 (arg1, arg2));
}

// void
el.xsignal3 = function xsignal3(/*Lisp_Object*/ error_symbol, /*Lisp_Object*/ arg1, /*Lisp_Object*/ arg2, /*Lisp_Object*/ arg3)
{
  el.xsignal (error_symbol, el.list3 (arg1, arg2, arg3));
}

/* Signal `error' with message S, and additional arg ARG.
   If ARG is not a genuine list, make it a one-element list.  */

// void
el.signal_error = function signal_error (/* const char * */ s, /*Lisp_Object*/ arg)
{
  // TODO
  // // Lisp_Object tortoise, hare;

  // // hare = tortoise = arg;
  // // while (CONSP (hare))
  // //   {
  // //     hare = XCDR (hare);
  // //     if (!CONSP (hare))
	// // break;

  // //     hare = XCDR (hare);
  // //     tortoise = XCDR (tortoise);

  // //     if (EQ (hare, tortoise))
	// // break;
  // //   }

  // // if (!NILP (hare))
  // //   arg = list1 (arg);

  el.xsignal (el.Qerror, el.Fcons (el.build_string (s), arg));
}



  }
}

function syms_of_data(el) {

  el.DEFSYM ("Qquote", "quote");
  el.DEFSYM ("Qlambda", "lambda");
  el.DEFSYM ("Qerror_conditions", "error-conditions");
  el.DEFSYM ("Qerror_message", "error-message");
  el.DEFSYM ("Qtop_level", "top-level");

  el.DEFSYM ("Qerror", "error");
  el.DEFSYM ("Quser_error", "user-error");
  el.DEFSYM ("Qquit", "quit");
  el.DEFSYM ("Qwrong_length_argument", "wrong-length-argument");
  el.DEFSYM ("Qwrong_type_argument", "wrong-type-argument");
  el.DEFSYM ("Qargs_out_of_range", "args-out-of-range");
  el.DEFSYM ("Qvoid_function", "void-function");
  el.DEFSYM ("Qcyclic_function_indirection", "cyclic-function-indirection");
  el.DEFSYM ("Qcyclic_variable_indirection", "cyclic-variable-indirection");
  el.DEFSYM ("Qvoid_variable", "void-variable");
  el.DEFSYM ("Qsetting_constant", "setting-constant");
  el.DEFSYM ("Qtrapping_constant", "trapping-constant");
  el.DEFSYM ("Qinvalid_read_syntax", "invalid-read-syntax");

  el.DEFSYM ("Qinvalid_function", "invalid-function");
  el.DEFSYM ("Qwrong_number_of_arguments", "wrong-number-of-arguments");
  el.DEFSYM ("Qno_catch", "no-catch");
  el.DEFSYM ("Qend_of_file", "end-of-file");
  el.DEFSYM ("Qarith_error", "arith-error");
  el.DEFSYM ("Qbeginning_of_buffer", "beginning-of-buffer");
  el.DEFSYM ("Qend_of_buffer", "end-of-buffer");
  el.DEFSYM ("Qbuffer_read_only", "buffer-read-only");
  el.DEFSYM ("Qtext_read_only", "text-read-only");
  el.DEFSYM ("Qmark_inactive", "mark-inactive");

  el.DEFSYM ("Qlistp", "listp");
  el.DEFSYM ("Qconsp", "consp");
  el.DEFSYM ("Qsymbolp", "symbolp");
}

with (el) {

  DEFUN2(function intern(name) {
    return INTERN(name);
  });

  DEFUN2(function fboundp(name) {
    return F.hasOwnProperty(name);
  });

  DEFUN2(function signal(name, data) {
    let err = new Error(name);
    err.data = data;
    throw err;
  });

  DEFUN2(function symbol_function(name) {
    if (!Ffboundp(name)) {
    }
  });


  
DEFUN ("signal", "Fsignal", "Ssignal", 2, 2, 0,
    {doc: ` Signal an error.  Args are ERROR-SYMBOL and associated DATA.
This function does not return.

An error symbol is a symbol with an \`error-conditions' property
that is a list of condition names.
A handler for any of those names will get to handle this signal.
The symbol \`error' should normally be one of them.

DATA should be a list.  Its elements are printed as part of the error message.
See Info anchor \`(elisp)Definition of signal' for some details on how this
error message is constructed.
If the signal is handled, DATA is made available to the handler.
See also the function \`condition-case'.  `,
       attributes: "noreturn"},
  function Fsignal (/*Lisp_Object*/ error_symbol, /*Lisp_Object*/ data)
{
  el.signal_or_quit (error_symbol, data, false);
  el.eassume (false);
});


/* Quit, in response to a keyboard quit request.  */
// Lisp_Object
el.quit = function quit (/*void*/)
{
  return el.signal_or_quit (el.Qquit, el.Qnil, true);
}

/* Signal an error, or quit.  ERROR_SYMBOL and DATA are as with Fsignal.
   If KEYBOARD_QUIT, this is a quit; ERROR_SYMBOL should be
   Qquit and DATA should be Qnil, and this function may return.
   Otherwise this function is like Fsignal and does not return.  */

// static Lisp_Object
el.signal_or_quit = function signal_or_quit (/*Lisp_Object*/ error_symbol, /*Lisp_Object*/ data, /*bool*/ keyboard_quit)
{
  console.log(error_symbol);
  console.log(el.Lisp_Object(data));
  console.log(el.Lisp_Object(el.XCDR(data)));
  throw new Error(x.name);
  // /* When memory is full, ERROR-SYMBOL is nil,
  //    and DATA is (REAL-ERROR-SYMBOL . REAL-DATA).
  //    That is a special case--don't do this in other situations.  */
  // Lisp_Object conditions;
  // Lisp_Object string;
  // Lisp_Object real_error_symbol
  //   = (NILP (error_symbol) ? Fcar (data) : error_symbol);
  // Lisp_Object clause = Qnil;
  // struct handler *h;

  // if (gc_in_progress || waiting_for_input)
  //   emacs_abort ();

// #if 0 /* rms: I don't know why this was here,
	 // but it is surely wrong for an error that is handled.  */
// #ifdef HAVE_WINDOW_SYSTEM
  // if (display_hourglass_p)
  //   cancel_hourglass ();
// #endif
// #endif

  // /* This hook is used by edebug.  */
  // if (! NILP (Vsignal_hook_function)
  //     && ! NILP (error_symbol))
  //   {
  //     /* Edebug takes care of restoring these variables when it exits.  */
  //     if (lisp_eval_depth + 20 > max_lisp_eval_depth)
	// max_lisp_eval_depth = lisp_eval_depth + 20;

  //     if (SPECPDL_INDEX () + 40 > max_specpdl_size)
	// max_specpdl_size = SPECPDL_INDEX () + 40;

  //     call2 (Vsignal_hook_function, error_symbol, data);
  //   }

  // conditions = Fget (real_error_symbol, Qerror_conditions);

  // /* Remember from where signal was called.  Skip over the frame for
  //    `signal' itself.  If a frame for `error' follows, skip that,
  //    too.  Don't do this when ERROR_SYMBOL is nil, because that
  //    is a memory-full error.  */
  // Vsignaling_function = Qnil;
  // if (!NILP (error_symbol))
  //   {
  //     union specbinding *pdl = backtrace_next (backtrace_top ());
  //     if (backtrace_p (pdl) && EQ (backtrace_function (pdl), Qerror))
	// pdl = backtrace_next (pdl);
  //     if (backtrace_p (pdl))
	// Vsignaling_function = backtrace_function (pdl);
  //   }

  // for (h = handlerlist; h; h = h->next)
  //   {
  //     if (h->type != CONDITION_CASE)
	// continue;
  //     clause = find_handler_clause (h->tag_or_ch, conditions);
  //     if (!NILP (clause))
	// break;
  //   }

  // if (/* Don't run the debugger for a memory-full error.
	 // (There is no room in memory to do that!)  */
  //     !NILP (error_symbol)
  //     && (!NILP (Vdebug_on_signal)
	  // /* If no handler is present now, try to run the debugger.  */
	  // || NILP (clause)
	  // /* A `debug' symbol in the handler list disables the normal
	     // suppression of the debugger.  */
	  // || (CONSP (clause) && !NILP (Fmemq (Qdebug, clause)))
	  // /* Special handler that means "print a message and run debugger
	     // if requested".  */
	  // || EQ (h->tag_or_ch, Qerror)))
  //   {
  //     bool debugger_called
	// = maybe_call_debugger (conditions, error_symbol, data);
  //     /* We can't return values to code which signaled an error, but we
	 // can continue code which has signaled a quit.  */
  //     if (keyboard_quit && debugger_called && EQ (real_error_symbol, Qquit))
	// return Qnil;
  //   }

  // if (!NILP (clause))
  //   {
  //     Lisp_Object unwind_data
	// = (NILP (error_symbol) ? data : Fcons (error_symbol, data));

  //     unwind_to_catch (h, unwind_data);
  //   }
  // else
  //   {
  //     if (handlerlist != handlerlist_sentinel)
	// /* FIXME: This will come right back here if there's no `top-level'
	   // catcher.  A better solution would be to abort here, and instead
	   // add a catch-all condition handler so we never come here.  */
	// Fthrow (Qtop_level, Qt);
  //   }

  // if (! NILP (error_symbol))
  //   data = Fcons (error_symbol, data);

  // string = Ferror_message_string (data);
  // fatal ("%s", SDATA (string));
}



  
DEFUN ("eq", "Feq", "Seq", 2, 2, 0,
    { doc: ` Return t if the two args are the same Lisp object.  `,
      attributes: 'const' },
  function Feq(obj1, obj2)
{
  if (EQ (obj1, obj2))
    return Qt;
  return Qnil;
})


  DEFUN ("null", "Fnull", "Snull", 1, 1, 0,
      {doc: ` Return t if OBJECT is nil, and return nil otherwise.  `,
        attributes: 'const'},
    function Fnull(object) {
    if (NILP (object))
      return Qt;
    return Qnil;
  })

DEFUN ("make-symbol", "Fmake_symbol", "Smake_symbol", 1, 1, 0,
    {doc: ` Return a newly allocated uninterned symbol whose name is NAME.
Its value is void, and its function definition and property list are nil.  `},
function Fmake_symbol (name)
{
  let /*Lisp_Object*/ val;

  el.CHECK_STRING (name);

  /*MALLOC_BLOCK_INPUT*/;

  if (el.symbol_free_list)
    {
      val = el.XSETSYMBOL (val, el.symbol_free_list);
      el.symbol_free_list = el.deref(symbol_free_list, '->next');
    }
  else
    {
      // if (el.symbol_block_index === el.SYMBOL_BLOCK_SIZE)
	// {
	  // let /* struct symbol_block * */ _new = lisp_malloc (sizeof *_new, MEM_TYPE_SYMBOL);
	  // _new->next = symbol_block;
	  // symbol_block = _new;
	  // symbol_block_index = 0;
	  // total_free_symbols += SYMBOL_BLOCK_SIZE;
	// }
      // val = XSETSYMBOL (val, &symbol_block->symbols[symbol_block_index].s);
      symbol_block_index++;
    }

  /*MALLOC_UNBLOCK_INPUT*/;

  el.init_symbol (val, name);
  // el.consing_since_gc += sizeof (struct Lisp_Symbol);
  el.symbols_consed++;
  el.total_free_symbols--;
  return val;
})




DEFUN ("cons", "Fcons", "Scons", 2, 2, 0,
    {doc: ` Create a new cons, give it CAR and CDR as components, and return it.  `},
  function Fcons (/*Lisp_Object*/ car, /*Lisp_Object*/ cdr)
{
  let /*register*/ /*Lisp_Object*/ val;

  // MALLOC_BLOCK_INPUT;

  if (el.cons_free_list)
    {
      // /* We use the cdr for chaining the free list
	 // so that we won't use the same field that has the mark bit.  */
      // XSETCONS (val, cons_free_list);
      // cons_free_list = cons_free_list->u.chain;
    }
  else
    {
      // if (cons_block_index == CONS_BLOCK_SIZE)
	// {
	  // struct cons_block *new
	    // = lisp_align_malloc (sizeof *new, MEM_TYPE_CONS);
	  // memset (new->gcmarkbits, 0, sizeof new->gcmarkbits);
	  // new->next = cons_block;
	  // cons_block = new;
	  // cons_block_index = 0;
	  // total_free_conses += CONS_BLOCK_SIZE;
	// }
      // XSETCONS (val, &cons_block->conses[cons_block_index]);
      // cons_block_index++;
    }

  // MALLOC_UNBLOCK_INPUT;
  let i = el.cons_cells_consed = el.cons_cells_consed || 0;
  val =  el.make_lisp_ptr(i, el.Lisp_Cons);

  XSETCAR (val, car);
  XSETCDR (val, cdr);
  // eassert (() => !CONS_MARKED_P (XCONS (val))); // TODO
  // consing_since_gc += sizeof (struct Lisp_Cons);
  el.total_free_conses--;
  el.cons_cells_consed++;
  return val;
})

// #ifdef GC_CHECK_CONS_LIST
// /* Get an error now if there's any junk in the cons free list.  */
// void
// check_cons_list (void)
// {
//   struct Lisp_Cons *tail = cons_free_list;

//   while (tail)
//     tail = tail->u.chain;
// }
// #endif


/* Make a list of 1, 2, 3, 4 or 5 specified objects.  */

// /*Lisp_Object*/
el.list1 = function list1 (/*Lisp_Object*/ arg1)
{
  return el.Fcons (arg1, el.Qnil);
}

// /*Lisp_Object*/
el.list2 = function list2 (/*Lisp_Object*/ arg1, /*Lisp_Object*/ arg2)
{
  return el.Fcons (arg1, el.Fcons (arg2, el.Qnil));
}


// /*Lisp_Object*/
el.list3 = function list3 (/*Lisp_Object*/ arg1, /*Lisp_Object*/ arg2, /*Lisp_Object*/ arg3)
{
  return el.Fcons (arg1, el.Fcons (arg2, el.Fcons (arg3, el.Qnil)));
}


// /*Lisp_Object*/
el.list4 = function list4 (/*Lisp_Object*/ arg1, /*Lisp_Object*/ arg2, /*Lisp_Object*/ arg3, /*Lisp_Object*/ arg4)
{
  return el.Fcons (arg1, el.Fcons (arg2, el.Fcons (arg3, el.Fcons (arg4, el.Qnil))));
}


// /*Lisp_Object*/
el.list5 = function list5 (/*Lisp_Object*/ arg1, /*Lisp_Object*/ arg2, /*Lisp_Object*/ arg3, /*Lisp_Object*/ arg4, /*Lisp_Object*/ arg5)
{
  return el.Fcons (arg1, el.Fcons (arg2, el.Fcons (arg3, el.Fcons (arg4,
						       el.Fcons (arg5, el.Qnil)))));
}

// /* Make a list of COUNT Lisp_Objects, where ARG is the
//    first one.  Allocate conses from pure space if TYPE
//    is CONSTYPE_PURE, or allocate as usual if type is CONSTYPE_HEAP.  */

// /*Lisp_Object*/
// listn (enum constype type, ptrdiff_t count, /*Lisp_Object*/ arg, ...)
// {
//   /*Lisp_Object*/ (*cons) (/*Lisp_Object*/, /*Lisp_Object*/);
//   switch (type)
//     {
//     case CONSTYPE_PURE: cons = pure_cons; break;
//     case CONSTYPE_HEAP: cons = el.Fcons; break;
//     default: emacs_abort ();
//     }

//   eassume (0 < count);
//   /*Lisp_Object*/ val = cons (arg, el.Qnil);
//   /*Lisp_Object*/ tail = val;

//   va_list ap;
//   va_start (ap, arg);
//   for (ptrdiff_t i = 1; i < count; i++)
//     {
//       /*Lisp_Object*/ elem = cons (va_arg (ap, /*Lisp_Object*/), el.Qnil);
//       el.XSETCDR (tail, elem);
//       tail = elem;
//     }
//   va_end (ap);

//   return val;
// }

// DEFUN ("list", "Flist", "Slist", 0, MANY, 0,
//        doc: /* Return a newly created list with specified arguments as elements.
// Any number of arguments, even zero arguments, are allowed.
// usage: (list &rest OBJECTS)  */)
//   (ptrdiff_t nargs, /*Lisp_Object*/ *args)
// {
//   register /*Lisp_Object*/ val;
//   val = el.Qnil;

//   while (nargs > 0)
//     {
//       nargs--;
//       val = el.Fcons (args[nargs], val);
//     }
//   return val;
// }


// DEFUN ("make-list", "Fmake_list", "Smake_list", 2, 2, 0,
//        doc: /* Return a newly created list of length LENGTH, with each element being INIT.  */)
//   (/*Lisp_Object*/ length, /*Lisp_Object*/ init)
// {
//   /*Lisp_Object*/ val = el.Qnil;
//   el.CHECK_NATNUM (length);

//   for (EMACS_INT size = el.XFASTINT (length); 0 < size; size--)
//     {
//       val = el.Fcons (init, val);
//       rarely_quit (size);
//     }

//   return val;
// }




// void
el.string_overflow = function string_overflow (/*void*/)
{
  el.error ("Maximum string size exceeded");
}

DEFUN ("make-string", "Fmake_string", "Smake_string", 2, 2, 0,
    {doc: ` Return a newly created string of length LENGTH, with INIT in each element.
LENGTH must be an integer.
INIT must be an integer that represents a character.  `},
  function Fmake_string (/*Lisp_Object*/ length, /*Lisp_Object*/ init)
{
  let /*register*/ /*Lisp_Object*/ val;
  let /*int*/ c;
  let /*EMACS_INT*/ nbytes;

  el.CHECK_NATNUM (length);
  el.CHECK_CHARACTER (init);

  c = el.XFASTINT (init);
  if (el.ASCII_CHAR_P (c))
    {
      nbytes = el.XINT (length);
      val = el.make_uninit_string (nbytes);
      if (nbytes)
	{
	  el.memset (el.SDATA (val), c, nbytes);
	  el.SDATA (val)[nbytes] = 0;
	}
    }
  else
    {
      // TODO
      // // unsigned char str[MAX_MULTIBYTE_LENGTH];
      // // ptrdiff_t len = CHAR_STRING (c, str);
      // // EMACS_INT string_len = XINT (length);
      // // unsigned char *p, *beg, *end;

      // // if (INT_MULTIPLY_WRAPV (len, string_len, &nbytes))
	// // string_overflow ();
      // // val = make_uninit_multibyte_string (string_len, nbytes);
      // // for (beg = SDATA (val), p = beg, end = beg + nbytes; p < end; p += len)
	// // {
	  // // /* First time we just copy `str' to the data of `val'.  */
	  // // if (p == beg)
	    // // memcpy (p, str, len);
	  // // else
	    // // {
	      // // /* Next time we copy largest possible chunk from
		 // // initialized to uninitialized part of `val'.  */
	      // // len = min (p - beg, end - p);
	      // // memcpy (p, beg, len);
	    // // }
	// // }
      // // if (nbytes)
	// // *p = 0;
    }

  return val;
}



}
