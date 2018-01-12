let mout = require('mout')
let Case = require('change-case');
let G = mout.lang.GLOBAL;
let ns = (name, G=mout.lang.GLOBAL) => { mout.object.namespace(G, name); return mout.object.get(G, name); }
var MutableBuffer = require('mutable-buffer');

let el_globals = require('./globals');

let el;
if (!G.hasOwnProperty('el')) {
  el = ns('el');
  el.env = el.env || {DEFINE_KEY_OPS_AS_MACROS: process.env.DEFINE_KEY_OPS_AS_MACROS || true};
  el_init(el);
} else {
  el = ns('el');
}

with_init(el);

  
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
  //  (eassert ((sym)->redirect === SYMBOL_PLAINVAL), (sym)->value = (v))
// #define lisp_h_SYMBOL_CONSTANT_P(sym) (XSYMBOL (sym)->constant)
// #define lisp_h_SYMBOL_VAL(sym) \
  //  (eassert ((sym)->redirect === SYMBOL_PLAINVAL), (sym)->value)
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

  el.EMACS_INT_WIDTH = 28;
  el.EMACS_INT_MAX = ((1<<el.EMACS_INT_WIDTH)-1);

  el.idiv = function (a, b) {
    a -= a % b;
    return a / b
  }

  el.PTRDIFF_MAX = el.idiv((-1 >>> 0), 2);

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

    el.Lisp_Bits = {
      GCALIGNMENT: el.GCALIGNMENT,
      VALBITS: el.VALBITS,
      INTTYPEBITS: el.INTTYPEBITS,
      FIXNUM_BIS: el.FIXNUM_BIS
    }


/* Define the fundamental Lisp data structures.  */

/* This is the set of Lisp data types.  If you want to define a new
   data type, read the comments after Lisp_Fwd_Type definition
   below.  */

/* Lisp integers use 2 tags, to give them one extra bit, thus
   extending their range from, e.g., -2^28..2^28-1 to -2^29..2^29-1.  */
  el.INTMASK = ((el.EMACS_INT_MAX >>> (el.INTTYPEBITS - 1)) | 0x80000000) >>> 0;
// #define case_Lisp_Int case Lisp_Int0: case Lisp_Int1
  
    
/* The maximum value that can be stored in a EMACS_INT, assuming all
   bits other than the type bits contribute to a nonnegative signed value.
   This can be used in #if, e.g., '#if USE_LSB_TAG' below expands to an
   expression involving VAL_MAX.  */
el.VAL_MAX = (el.EMACS_INT_MAX >>> (el.GCTYPEBITS - 1))
el.VALMASK = ((el.env.USE_LSB_TAG ? - (1 << el.GCTYPEBITS) : el.VAL_MAX) | 0x80000000) >>> 0;


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
      if (true) {
        throw new Error("assertion failed: " + cond.toString());
      } else {
        console.error("assertion failed: " + cond.toString());
        process.exit(1);
      }
    }
  }
  el.eassume = el.eassert;
    

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

  // el.make_symbol = function make_symbol(name, idx) {
  //   // if (idx === null) {
  //   //   idx = el.SYMS.length;
  //   // }
  //   let sym = {type: el.KEY("symbol"), name: name, plist: {}}
  //   if (idx != null) {
  //     el.SYMS[idx] = sym;
  //   }
  //   return sym;
  // }

  el.DEFSYM = function defsym(sym, name) {
    // el[sym] = el.make_symbol(name);
    // let sym = el.lisp_obj(null, el.Lisp_Symbol);
    // // el.heap[el.Lisp_Symbol][i] = sym;
    // el[sybolic] = sym;
    // el.lispsym[i] = sym;
    return el.define_symbol(sym, name);
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

  el.DEFUN = function defun(lname, fnname, sname, minargs, maxargs, intspec, attrs, fsubr) {
    if (typeof attrs === 'string') {
      attrs = {doc: attrs}
    }
    let subr = el.XSETPVECTYPE(null, el.PVEC_SUBR);
    Object.assign(subr, {minargs, maxargs, intspec, fnname, lname, ['a'+maxargs]: fsubr}, attrs);
    el[sname] = subr;
    el[fnname] = fsubr;
  }

  el.defsubr = function defsubr (/*struct Lisp_Subr * */ sname) {
    let /*Lisp_Object*/ sym, tem;
    console.log(sname);
    sym = el.intern_c_string (sname.lname);
    el.XSETPVECTYPE (sname, el.PVEC_SUBR);
    el.XSETSUBR (tem, sname);
    el.set_symbol_function (sym, tem);
  }
  
  // INLINE Lisp_Object
  el.intern = function intern (/* const char * */str)
  {
    return el.intern_1 (str, el.strlen (str));
  }

  // INLINE Lisp_Object
  el.intern_c_string = function intern_c_string (/* const char * */str)
  {
    return el.intern_c_string_1 (str, el.strlen (str));
  }
}

function with_init(el) {
  with (el) {

/* Header of vector-like objects.  This documents the layout constraints on
   vectors and pseudovectors (objects of PVEC_xxx subtype).  It also prevents
   compilers from being fooled by Emacs's type punning: XSETPSEUDOVECTOR
   and PSEUDOVECTORP cast their pointers to struct vectorlike_header *,
   because when two such pointers potentially alias, a compiler won't
   incorrectly reorder loads and stores to their size fields.  See
   Bug#8546.  */
// struct vectorlike_header
  {
    /* The only field contains various pieces of information:
       - The MSB (ARRAY_MARK_FLAG) holds the gcmarkbit.
       - The next bit (PSEUDOVECTOR_FLAG) indicates whether this is a plain
         vector (0) or a pseudovector (1).
       - If PSEUDOVECTOR_FLAG is 0, the rest holds the size (number
         of slots) of the vector.
       - If PSEUDOVECTOR_FLAG is 1, the rest is subdivided into three fields:
	 - a) pseudovector subtype held in PVEC_TYPE_MASK field;
	 - b) number of Lisp_Objects slots at the beginning of the object
	   held in PSEUDOVECTOR_SIZE_MASK field.  These objects are always
	   traced by the GC;
	 - c) size of the rest fields held in PSEUDOVECTOR_REST_MASK and
	   measured in word_size units.  Rest fields may also include
	   Lisp_Objects, but these objects usually needs some special treatment
	   during GC.
	 There are some exceptions.  For PVEC_FREE, b) is always zero.  For
	 PVEC_BOOL_VECTOR and PVEC_SUBR, both b) and c) are always zero.
	 Current layout limits the pseudovectors to 63 PVEC_xxx subtypes,
	 4095 Lisp_Objects in GC-ed area and 4095 word-sized other slots.  */
    // ptrdiff_t size;
  };
    



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
    prn = function (x) {
      console.log(x);
      return x;
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
       eassert (() => true
           // el.deref((sym)).redirect === SYMBOL_PLAINVAL
           );
       el.deref(sym).value = v;
       return sym;
    }
    el.lisp_h_SYMBOL_CONSTANT_P = function lisp_h_SYMBOL_CONSTANT_P(sym) { return (XSYMBOL (sym)["->constant"]); }
    el.lisp_h_SYMBOL_VAL = function lisp_h_SYMBOL_VAL(sym) { 
      return (eassert (() => el.deref(sym).redirect === SYMBOL_PLAINVAL), (sym)["->val"].value); }
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
            // /*(struct Lisp_Symbol *)*/ (/*(uintptr_t)*/ XLI (a) - Lisp_Symbol 
            //   + /*(char *)*/ lispsym))
        el.deref(a))
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
        if (typeof a === 'object' && a.type !== null) {
          return a.type;
        }
        if (el.env.USE_LSB_TAG) {
          return el.lisp_h_XTYPE (a);
        } else {
          let /*EMACS_UINT*/ i = el.XLI (a);
          //return el.env.USE_LSB_TAG ? (i & ~el.VALMASK) : ((i&~el.VALMASK) >>> el.FIXNUM_BITS);
          return el.env.USE_LSB_TAG ? (i & ~el.VALMASK) : ((i < 0) ? ~i : i) >>> el.FIXNUM_BITS;
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
        if (typeof a === 'object' && a.index !== null) {
          return a.index;
        }
        if (el.env.USE_LSB_TAG) {
          return el.lisp_h_XUNTAG (a, type);
        } else {
          // let /*intptr_t*/ i = el.env.USE_LSB_TAG ? el.XLI (a) - type : el.XLI (a) & el.VALMASK;
          // return /*(void *)*/ i;

          // return (a < 0 ? ~a : a) 
          let mask = ((1 << el.FIXNUM_BITS)-1);
          return (a < 0) ? (a | ~mask) - 1 : (a & mask)

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
        let n = (tag << el.FIXNUM_BITS);
        return el.env.USE_LSB_TAG 
         ? /*(intptr_t)*/ (ptr) + (tag) 
         // : /*(EMACS_INT)*/ ((/*(EMACS_UINT)*/ n) + /*(uintptr_t)*/ (ptr));
         : (ptr < 0) ? -(~ptr | n) : (ptr | n)
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


el.deref = function ref(ptr) {
  if (typeof ptr === "number") {
    return el.Lisp_Object(ptr);
  } else {
    return ptr;
  }
}

el.Lisp_Object = function Lisp_Object(ptr) {
  let type = el.XTYPE(ptr);
  let tag = el.XUNTAG(ptr, type);

  // eassert(() => el.heap[ptr]);
  el.eassert(() => tag < el.heap[type].length);
  let obj = el.heap[type][tag];
  if (obj == null) {
    el.heap[type][tag] = obj = {}
    obj.type = type;
    obj.index = tag;
    if (el.VECTORLIKEP(obj)) {
      obj.header = {size: 0}
    }
  }
  // return el.heap[type][tag];
  // return el.heap[ptr];
  return obj;
}


/* Construct a Lisp_Object from a value or address.  */

el.type_counts = el.type_counts || {}
el.counts = el.counts || 0

el.next_index = function next_index(type, count = 1) {
  return el.counts += count;
  let i = el.type_counts[type]||0;
  if (type === el.Lisp_Symbol && i < el.iQ_MAX) {
    i = el.iQ_MAX;
  }
  el.type_counts[type] = i + count;
  return i;
}

// INLINE Lisp_Object
el.make_lisp_ptr = function make_lisp_ptr (/*void **/ offset, /*enum Lisp_Type*/ type)
{
  let ptr;
  if (offset == null) {
    el.eassert (() => type != null);
    offset = el.next_index(type);
    ptr = el.TAG_PTR (type, offset);
  } else {
    offset = el.XUNTAG(offset, type);
  }
  let /*Lisp_Object*/ a = el.XIL (el.TAG_PTR (type, offset));
  el.eassert (() => (el.XTYPE (a) === type));
  // console.log({a, tag: el.XUNTAG (a, type), ptr, offset, type})
  el.eassert (() => el.XUNTAG (a, type) === offset);
  return a;
}

el.lisp_obj = function lisp_obj ( offset, type ) {
  return el.Lisp_Object(el.make_lisp_ptr(offset, type))
}


/* Like malloc but used for allocating Lisp data.  NBYTES is the
   number of bytes to allocate, TYPE describes the intended use of the
   allocated memory block (for strings, for conses, ...).  */

if (!el.env.USE_LSB_TAG) {
// void *lisp_malloc_loser EXTERNALLY_VISIBLE;
}



/* Interned state of a symbol.  */

el.symbol_interned =
{
  SYMBOL_UNINTERNED: 0,
  SYMBOL_INTERNED: 1,
  SYMBOL_INTERNED_IN_INITIAL_OBARRAY: 2
};
Object.assign(el, el.symbol_interned);

el.symbol_redirect =
{
  SYMBOL_PLAINVAL : 4,
  SYMBOL_VARALIAS : 1,
  SYMBOL_LOCALIZED: 2,
  SYMBOL_FORWARDED: 3
};
Object.assign(el, el.symbol_redirect);

el.symbol_trapped_write =
{
  SYMBOL_UNTRAPPED_WRITE: 0,
  SYMBOL_NOWRITE: 1,
  SYMBOL_TRAPPED_WRITE: 2
};
Object.assign(el, el.symbol_trapped_write);

// struct Lisp_Symbol
// {
//   bool_bf gcmarkbit : 1;

//   /* Indicates where the value can be found:
//      0 : it's a plain var, the value is in the `value' field.
//      1 : it's a varalias, the value is really in the `alias' symbol.
//      2 : it's a localized var, the value is in the `blv' object.
//      3 : it's a forwarding variable, the value is in `forward'.  */
//   ENUM_BF (symbol_redirect) redirect : 3;

//   /* 0 : normal case, just set the value
//      1 : constant, cannot set, e.g. nil, t, :keywords.
//      2 : trap the write, call watcher functions.  */
//   ENUM_BF (symbol_trapped_write) trapped_write : 2;

//   /* Interned state of the symbol.  This is an enumerator from
//      enum symbol_interned.  */
//   unsigned interned : 2;

//   /* True means that this variable has been explicitly declared
//      special (with `defvar' etc), and shouldn't be lexically bound.  */
//   bool_bf declared_special : 1;

//   /* True if pointed to from purespace and hence can't be GC'd.  */
//   bool_bf pinned : 1;

//   /* The symbol's name, as a Lisp string.  */
//   Lisp_Object name;

//   /* Value of the symbol or Qunbound if unbound.  Which alternative of the
//      union is used depends on the `redirect' field above.  */
//   union {
//     Lisp_Object value;
//     struct Lisp_Symbol *alias;
//     struct Lisp_Buffer_Local_Value *blv;
//     union Lisp_Fwd *fwd;
//   } val;

//   /* Function value of the symbol or Qnil if not fboundp.  */
//   Lisp_Object function;

//   /* The symbol's property list.  */
//   Lisp_Object plist;

//   /* Next symbol in obarray bucket, if the symbol is interned.  */
//   struct Lisp_Symbol *next;
// };




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
    // prn(a);
    el.eassert (() => el.SYMBOLP (a));
    // let /*intptr_t*/ i = /*(intptr_t)*/ el.XUNTAG (a, el.Lisp_Symbol);
    // let /* void * */ p = /*(char *)*/ el.lispsym + i;
    // return p;
    return el.deref(a);
  }
}

// INLINE Lisp_Object
el.make_lisp_symbol = function make_lisp_symbol(offset)
{
  // let /*Lisp_Object*/ a = el.XIL (el.TAG_SYMOFFSET (/*(char *)*/ sym - /*(char *)*/ el.lispsym));
  let a = el.XIL (el.TAG_SYMOFFSET(offset))
    console.log(a);
  // el.eassert (() => el.XSYMBOL (a).index === offset);
  return a;
}

// INLINE Lisp_Object
el.builtin_lisp_symbol = function builtin_lisp_symbol(/*int*/ index)
{
  return el.make_lisp_symbol (index);
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



// /* In the size word of a vector, this bit means the vector has been marked.  */

// DEFINE_GDB_SYMBOL_BEGIN (ptrdiff_t, ARRAY_MARK_FLAG)
// # define ARRAY_MARK_FLAG PTRDIFF_MIN
// DEFINE_GDB_SYMBOL_END (ARRAY_MARK_FLAG)
el.ARRAY_MARK_FLAG = el.PTRDIFF_MIN;

// /* In the size word of a struct Lisp_Vector, this bit means it's really
//    some other vector-like object.  */
// DEFINE_GDB_SYMBOL_BEGIN (ptrdiff_t, PSEUDOVECTOR_FLAG)
// # define PSEUDOVECTOR_FLAG (PTRDIFF_MAX - PTRDIFF_MAX / 2)
// DEFINE_GDB_SYMBOL_END (PSEUDOVECTOR_FLAG)
el.PSEUDOVECTOR_FLAG = (el.PTRDIFF_MAX - el.idiv(el.PTRDIFF_MAX, 2));

/* In a pseudovector, the size field actually contains a word with one
   PSEUDOVECTOR_FLAG bit set, and one of the following values extracted
   with PVEC_TYPE_MASK to indicate the actual type.  */
var n = 0;
el.pvec_type =
{
  PVEC_NORMAL_VECTOR: n++,
  PVEC_FREE: n++,
  PVEC_PROCESS: n++,
  PVEC_FRAME: n++,
  PVEC_WINDOW: n++,
  PVEC_BOOL_VECTOR: n++,
  PVEC_BUFFER: n++,
  PVEC_HASH_TABLE: n++,
  PVEC_TERMINAL: n++,
  PVEC_WINDOW_CONFIGURATION: n++,
  PVEC_SUBR: n++,
  PVEC_OTHER: n++,            /* Should never be visible to Elisp code.  */
  PVEC_XWIDGET: n++,
  PVEC_XWIDGET_VIEW: n++,
  PVEC_THREAD: n++,
  PVEC_MUTEX: n++,
  PVEC_CONDVAR: n++,

  /* These should be last, check internal_equal to see why.  */
  PVEC_COMPILED: n++,
  PVEC_CHAR_TABLE: n++,
  PVEC_SUB_CHAR_TABLE: n++,
  PVEC_RECORD: n++,
  PVEC_FONT: n++ /* Should be last because it's used for range checking.  */
};
Object.assign(el, el.pvec_type);

el.More_Lisp_Bits = {};
    /* For convenience, we also store the number of elements in these bits.
       Note that this size is not necessarily the memory-footprint size, but
       only the number of Lisp_Object fields (that need to be traced by GC).
       The distinction is used, e.g., by Lisp_Process, which places extra
       non-Lisp_Object fields at the end of the structure.  */
    el.More_Lisp_Bits.PSEUDOVECTOR_SIZE_BITS = 12,
    el.More_Lisp_Bits.PSEUDOVECTOR_SIZE_MASK = (1 << el.More_Lisp_Bits.PSEUDOVECTOR_SIZE_BITS) - 1,

    /* To calculate the memory footprint of the pseudovector, it's useful
       to store the size of non-Lisp area in word_size units here.  */
    el.More_Lisp_Bits.PSEUDOVECTOR_REST_BITS = 12,
    el.More_Lisp_Bits.PSEUDOVECTOR_REST_MASK = (((1 << el.More_Lisp_Bits.PSEUDOVECTOR_REST_BITS) - 1)
			      << el.More_Lisp_Bits.PSEUDOVECTOR_SIZE_BITS),

    /* Used to extract pseudovector subtype information.  */
    el.More_Lisp_Bits.PSEUDOVECTOR_AREA_BITS = el.More_Lisp_Bits.PSEUDOVECTOR_SIZE_BITS + el.More_Lisp_Bits.PSEUDOVECTOR_REST_BITS,
    el.More_Lisp_Bits.PVEC_TYPE_MASK = 0x3f << el.More_Lisp_Bits.PSEUDOVECTOR_AREA_BITS
Object.assign(el, el.More_Lisp_Bits);






if (!el.env.USE_LSB_TAG) {

/* Although compiled only if ! USE_LSB_TAG, the following functions
   also work when USE_LSB_TAG; this is to aid future maintenance when
   the lisp_h_* macros are eventually removed.  */

/* Make a Lisp integer representing the value of the low order
   bits of N.  */
// INLINE Lisp_Object
el.make_number = function make_number (/*EMACS_INT*/ n)
// {
//   let /*EMACS_INT*/ int0 = el.Lisp_Int0;
//   if (el.env.USE_LSB_TAG)
//     {
//       let /*EMACS_UINT*/ u = (n >= 0) ? n : ~(-n);
//       n = u << el.INTTYPEBITS;
//       n += int0;
//     }
//   else
//     {
//       let /*EMACS_UINT*/ u = (n >= 0) ? n : ~(-n);
//       // u &= el.INTMASK;
//       u += (int0 << el.VALBITS);
//       u = (n >= 0) ? u : ~(-u);
//       n = u;
//     }
//   return el.XIL (n);
// }

// {
//   if (el.env.USE_LSB_TAG)
//     {
//       let /*EMACS_UINT*/ u = n >>> 0;
//       n = u << INTTYPEBITS;
//       n += el.Lisp_Int0;
//     }
//   else
//     {
//       // n &= el.INTMASK;
//       // n += (el.Lisp_Int0 << VALBITS);
//       return el.VALMASK & (n >>> 0) | (el.Lisp_Int0 << el.FIXNUM_BITS)
//     }
//   return XIL (n);
// }

{
  return el.TAG_PTR(el.Lisp_Int0, n);
}

// (el.Lisp_Int0 << el.VALBITS)

el.iArr = new Int32Array([0]);

/* Extract A's value as a signed integer.  */
// INLINE EMACS_INT
el.XINT = function XINT (/*Lisp_Object*/ a)
{
  return el.XUNTAG(a, el.Lisp_int0);
}
// {
//   let /*EMACS_INT*/ i = el.XLI (a);
//   if (! el.env.USE_LSB_TAG)
//     {
//       el.iArr[0] = i - (el.Lisp_Int0 << el.VALBITS);
//       return el.iArr[0];
//     }
//   return i >> el.INTTYPEBITS;
// }

/* Like XINT (A), but may be faster.  A must be nonnegative.
   If ! USE_LSB_TAG, this takes advantage of the fact that Lisp
   integers have zero-bits in their tags.  */
// INLINE EMACS_INT
el.XFASTINT = function XFASTINT (/*Lisp_Object*/ a)
{
  let /*EMACS_INT*/ int0 = el.Lisp_Int0;
  let /*EMACS_INT*/ n = el.env.USE_LSB_TAG ? el.XINT (a) : el.XLI (a) - (int0 << el.FIXNUM_BITS);
  el.eassume (() => 0 <= n);
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

/* Pseudovector types.  */

el.XSETPVECTYPE = function XSETPVECTYPE (v, code) { 
  if (v == null) {
    v = el.lisp_obj(null, el.Lisp_Vectorlike);
  }
  (el.deref(v).header.size |= el.PSEUDOVECTOR_FLAG | ((code) << el.PSEUDOVECTOR_AREA_BITS));
  return v;
}

el.XSETPVECTYPESIZE = function XSETPVECTYPESIZE (v, code, lispsize, restsize) {
  (el.deref(v).header.size = (el.PSEUDOVECTOR_FLAG			
		       | ((code) << el.PSEUDOVECTOR_AREA_BITS)	
		       | ((restsize) << el.PSEUDOVECTOR_SIZE_BITS) 
		       | (lispsize)))
    return v;
}

/* The cast to struct vectorlike_header * avoids aliasing issues.  */
el.XSETPSEUDOVECTOR = function XSETPSEUDOVECTOR (a, b, code) {
  return el.XSETTYPED_PSEUDOVECTOR (a, b,					
			  (el.deref(/*(struct vectorlike_header *)*/	
			    el.XUNTAG (a, el.Lisp_Vectorlike))	
			   .size),
			  code)
}
el.XSETTYPED_PSEUDOVECTOR = function XSETTYPED_PSEUDOVECTOR (a, b, size, code) {
  return (el.XSETVECTOR (a, b),							
   el.eassert ((size & (el.PSEUDOVECTOR_FLAG | el.PVEC_TYPE_MASK))		
	    == (el.PSEUDOVECTOR_FLAG | (code << el.PSEUDOVECTOR_AREA_BITS))))
}

el.XSETWINDOW_CONFIGURATION = function XSETWINDOW_CONFIGURATION (a, b) { return (el.XSETPSEUDOVECTOR (a, b, el.PVEC_WINDOW_CONFIGURATION)); }
el.XSETPROCESS = function XSETPROCESS (a, b) { return (el.XSETPSEUDOVECTOR (a, b, el.PVEC_PROCESS)); }
el.XSETWINDOW = function XSETWINDOW (a, b) { return (el.XSETPSEUDOVECTOR (a, b, el.PVEC_WINDOW)); }
el.XSETTERMINAL = function XSETTERMINAL (a, b) { return (el.XSETPSEUDOVECTOR (a, b, el.PVEC_TERMINAL)); }
el.XSETSUBR = function XSETSUBR (a, b) { return (el.XSETPSEUDOVECTOR (a, b, el.PVEC_SUBR)); }
el.XSETCOMPILED = function XSETCOMPILED (a, b) { return (el.XSETPSEUDOVECTOR (a, b, el.PVEC_COMPILED)); }
el.XSETBUFFER = function XSETBUFFER (a, b) { return (el.XSETPSEUDOVECTOR (a, b, el.PVEC_BUFFER)); }
el.XSETCHAR_TABLE = function XSETCHAR_TABLE (a, b) { return (el.XSETPSEUDOVECTOR (a, b, el.PVEC_CHAR_TABLE)); }
el.XSETBOOL_VECTOR = function XSETBOOL_VECTOR (a, b) { return (el.XSETPSEUDOVECTOR (a, b, el.PVEC_BOOL_VECTOR)); }
el.XSETSUB_CHAR_TABLE = function XSETSUB_CHAR_TABLE (a, b) { return (el.XSETPSEUDOVECTOR (a, b, el.PVEC_SUB_CHAR_TABLE)); }
el.XSETTHREAD = function XSETTHREAD (a, b) { return (el.XSETPSEUDOVECTOR (a, b, el.PVEC_THREAD)); }
el.XSETMUTEX = function XSETMUTEX (a, b) { return (el.XSETPSEUDOVECTOR (a, b, el.PVEC_MUTEX)); }
el.XSETCONDVAR = function XSETCONDVAR (a, b) { return (el.XSETPSEUDOVECTOR (a, b, el.PVEC_CONDVAR)); }







// /* Data type checking.  */

// INLINE bool
el.NUMBERP = function NUMBERP (/*Lisp_Object*/ x)
{
  return el.INTEGERP (x) || el.FLOATP (x);
}
// INLINE bool
el.NATNUMP = function NATNUMP (/*Lisp_Object*/ x)
{
  return el.INTEGERP (x) && 0 <= el.XINT (x);
}

// INLINE bool
el.RANGED_INTEGERP = function RANGED_INTEGERP (/*intmax_t*/ lo, /*Lisp_Object*/ x, /*intmax_t*/ hi)
{
  return el.INTEGERP (x) && lo <= el.XINT (x) && el.XINT (x) <= hi;
}

// #define TYPE_RANGED_INTEGERP(type, x) \
//   (INTEGERP (x)			      \
//    && (TYPE_SIGNED (type) ? TYPE_MINIMUM (type) <= XINT (x) : 0 <= XINT (x)) \
//    && XINT (x) <= TYPE_MAXIMUM (type))

// INLINE bool
// AUTOLOADP (Lisp_Object x)
// {
//   return CONSP (x) && EQ (Qautoload, XCAR (x));
// }


// /* Test for specific pseudovector types.  */

// INLINE bool
// WINDOW_CONFIGURATIONP (Lisp_Object a)
// {
//   return PSEUDOVECTORP (a, PVEC_WINDOW_CONFIGURATION);
// }

// INLINE bool
// COMPILEDP (Lisp_Object a)
// {
//   return PSEUDOVECTORP (a, PVEC_COMPILED);
// }

// INLINE bool
// FRAMEP (Lisp_Object a)
// {
//   return PSEUDOVECTORP (a, PVEC_FRAME);
// }

// INLINE bool
// RECORDP (Lisp_Object a)
// {
//   return PSEUDOVECTORP (a, PVEC_RECORD);
// }

// INLINE void
// CHECK_RECORD (Lisp_Object x)
// {
//   CHECK_TYPE (RECORDP (x), Qrecordp, x);
// }

// /* Test for image (image . spec)  */
// INLINE bool
// IMAGEP (Lisp_Object x)
// {
//   return CONSP (x) && EQ (XCAR (x), Qimage);
// }

// /* Array types.  */
// INLINE bool
// ARRAYP (Lisp_Object x)
// {
//   return VECTORP (x) || STRINGP (x) || CHAR_TABLE_P (x) || BOOL_VECTOR_P (x);
// }
// 
// INLINE void
// CHECK_LIST (Lisp_Object x)
// {
//   CHECK_TYPE (CONSP (x) || NILP (x), Qlistp, x);
// }

// INLINE void
// CHECK_LIST_END (Lisp_Object x, Lisp_Object y)
// {
//   CHECK_TYPE (NILP (x), Qlistp, y);
// }

// INLINE void
// (CHECK_NUMBER) (Lisp_Object x)
// {
//   lisp_h_CHECK_NUMBER (x);
// }

// INLINE void
// CHECK_STRING_CAR (Lisp_Object x)
// {
//   CHECK_TYPE (STRINGP (XCAR (x)), Qstringp, XCAR (x));
// }
// /* This is a bit special because we always need size afterwards.  */
// INLINE ptrdiff_t
// CHECK_VECTOR_OR_STRING (Lisp_Object x)
// {
//   if (VECTORP (x))
//     return ASIZE (x);
//   if (STRINGP (x))
//     return SCHARS (x);
//   wrong_type_argument (Qarrayp, x);
// }
// INLINE void
// CHECK_ARRAY (Lisp_Object x, Lisp_Object predicate)
// {
//   CHECK_TYPE (ARRAYP (x), predicate, x);
// }
// INLINE void
el.CHECK_NATNUM = function CHECK_NATNUM (/*Lisp_Object*/ x)
{
  el.CHECK_TYPE (el.NATNUMP (x), el.Qwholenump, x);
}

// #define CHECK_RANGED_INTEGER(x, lo, hi)					\
//   do {									\
//     CHECK_NUMBER (x);							\
//     if (! ((lo) <= XINT (x) && XINT (x) <= (hi)))			\
//       args_out_of_range_3						\
// 	(x,								\
// 	 make_number ((lo) < 0 && (lo) < MOST_NEGATIVE_FIXNUM		\
// 		      ? MOST_NEGATIVE_FIXNUM				\
// 		      : (lo)),						\
// 	 make_number (min (hi, MOST_POSITIVE_FIXNUM)));			\
//   } while (false)
// #define CHECK_TYPE_RANGED_INTEGER(type, x) \
//   do {									\
//     if (TYPE_SIGNED (type))						\
//       CHECK_RANGED_INTEGER (x, TYPE_MINIMUM (type), TYPE_MAXIMUM (type)); \
//     else								\
//       CHECK_RANGED_INTEGER (x, 0, TYPE_MAXIMUM (type));			\
//   } while (false)

// #define CHECK_NUMBER_COERCE_MARKER(x)					\
//   do {									\
//     if (MARKERP ((x)))							\
//       XSETFASTINT (x, marker_position (x));				\
//     else								\
//       CHECK_TYPE (INTEGERP (x), Qinteger_or_marker_p, x);		\
//   } while (false)

// INLINE double
// XFLOATINT (Lisp_Object n)
// {
//   return FLOATP (n) ? XFLOAT_DATA (n) : XINT (n);
// }

// INLINE void
// CHECK_NUMBER_OR_FLOAT (Lisp_Object x)
// {
//   CHECK_TYPE (NUMBERP (x), Qnumberp, x);
// }

// #define CHECK_NUMBER_OR_FLOAT_COERCE_MARKER(x)				\
//   do {									\
//     if (MARKERP (x))							\
//       XSETFASTINT (x, marker_position (x));				\
//     else								\
//       CHECK_TYPE (NUMBERP (x), Qnumber_or_marker_p, x);			\
//   } while (false)

// /* Since we can't assign directly to the CAR or CDR fields of a cons
//    cell, use these when checking that those fields contain numbers.  */
// INLINE void
// CHECK_NUMBER_CAR (Lisp_Object x)
// {
//   Lisp_Object tmp = XCAR (x);
//   CHECK_NUMBER (tmp);
//   XSETCAR (x, tmp);
// }

// INLINE void
// CHECK_NUMBER_CDR (Lisp_Object x)
// {
//   Lisp_Object tmp = XCDR (x);
//   CHECK_NUMBER (tmp);
//   XSETCDR (x, tmp);
// }



/* This structure describes a built-in function.
   It is generated by the DEFUN macro only.
   defsubr makes it into a Lisp object.  */

// struct Lisp_Subr
//   {
//     struct vectorlike_header header;
//     union {
//       Lisp_Object (*a0) (void);
//       Lisp_Object (*a1) (Lisp_Object);
//       Lisp_Object (*a2) (Lisp_Object, Lisp_Object);
//       Lisp_Object (*a3) (Lisp_Object, Lisp_Object, Lisp_Object);
//       Lisp_Object (*a4) (Lisp_Object, Lisp_Object, Lisp_Object, Lisp_Object);
//       Lisp_Object (*a5) (Lisp_Object, Lisp_Object, Lisp_Object, Lisp_Object, Lisp_Object);
//       Lisp_Object (*a6) (Lisp_Object, Lisp_Object, Lisp_Object, Lisp_Object, Lisp_Object, Lisp_Object);
//       Lisp_Object (*a7) (Lisp_Object, Lisp_Object, Lisp_Object, Lisp_Object, Lisp_Object, Lisp_Object, Lisp_Object);
//       Lisp_Object (*a8) (Lisp_Object, Lisp_Object, Lisp_Object, Lisp_Object, Lisp_Object, Lisp_Object, Lisp_Object, Lisp_Object);
//       Lisp_Object (*aUNEVALLED) (Lisp_Object args);
//       Lisp_Object (*aMANY) (ptrdiff_t, Lisp_Object *);
//     } function;
//     short min_args, max_args;
//     const char *symbol_name;
//     const char *intspec;
//     EMACS_INT doc;
//   };

// INLINE bool
el.SUBRP = function SUBRP (/*Lisp_Object*/ a)
{
  return el.PSEUDOVECTORP (a, el.PVEC_SUBR);
}

// INLINE struct Lisp_Subr *
el.XSUBR = function XSUBR (/*Lisp_Object*/ a)
{
  el.eassert (() => el.SUBRP (a));
  return el.XUNTAG (a, el.Lisp_Vectorlike);
}


// static void
el.CHECK_SUBR = function CHECK_SUBR (/*Lisp_Object*/ x)
{
  el.CHECK_TYPE (el.SUBRP (x), el.Qsubrp, x);
}




/* character code	1st byte   byte sequence
   --------------	--------   -------------
        0-7F		00..7F	   0xxxxxxx
       80-7FF		C2..DF	   110xxxxx 10xxxxxx
      800-FFFF		E0..EF	   1110xxxx 10xxxxxx 10xxxxxx
    10000-1FFFFF	F0..F7	   11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
   200000-3FFF7F	F8	   11111000 1000xxxx 10xxxxxx 10xxxxxx 10xxxxxx
   3FFF80-3FFFFF	C0..C1	   1100000x 10xxxxxx (for eight-bit-char)
   400000-...		invalid

   invalid 1st byte	80..BF	   10xxxxxx
			F9..FF	   11111xxx (xxx != 000)
*/

/* Maximum character code ((1 << CHARACTERBITS) - 1).  */
el.MAX_CHAR = 0x3FFFFF

/* Maximum Unicode character code.  */
el.MAX_UNICODE_CHAR = 0x10FFFF

/* Maximum N-byte character codes.  */
el.MAX_1_BYTE_CHAR = 0x7F
el.MAX_2_BYTE_CHAR = 0x7FF
el.MAX_3_BYTE_CHAR = 0xFFFF
el.MAX_4_BYTE_CHAR = 0x1FFFFF
el.MAX_5_BYTE_CHAR = 0x3FFF7F

/* Minimum leading code of multibyte characters.  */
el.MIN_MULTIBYTE_LEADING_CODE = 0xC0
/* Maximum leading code of multibyte characters.  */
el.MAX_MULTIBYTE_LEADING_CODE = 0xF8


/* True iff C is an ASCII character.  */
el.ASCII_CHAR_P = function ASCII_CHAR_P(c) { return (c >>> 0) < 0x80; }


/* Nonzero iff X is a character.  */
el.CHARACTERP = function CHARACTERP(x) {
  return (el.NATNUMP (x) && el.XFASTINT (x) <= el.MAX_CHAR)
}

/* Nonzero iff C is valid as a character code.  */
el.CHAR_VALID_P = function CHAR_VALID_P(c) {
  return (c >>> 0) <= el.MAX_CHAR;
}

/* Check if Lisp object X is a character or not.  */
el.CHECK_CHARACTER = function CHECK_CHARACTER(x) {
  return el.CHECK_TYPE (el.CHARACTERP (x), el.Qcharacterp, x)
}





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

/* True if STR is a multibyte string.  */
// INLINE bool
el.STRING_MULTIBYTE = function STRING_MULTIBYTE (/*Lisp_Object*/ str)
{
  return 0 <= el.XSTRING (str).size_byte;
}

/* Convenience functions for dealing with Lisp strings.  */

// INLINE unsigned char *
el.SDATA = function SDATA (/*Lisp_Object*/ string)
{
  let str = el.XSTRING (string);
  if (!str.data) {
    str.data = new MutableBuffer(/* initialSize, blockSize */);
    str.size = 0;
    str.size_byte = -1;
    str.intervals = null;
  }
  return str.data;
}
// INLINE char *
el.SSDATA = function SSDATA (/*Lisp_Object*/ string)
{
  // /* Avoid "differ in sign" warnings.  */
  // return (char *) SDATA (string);
  return el.SDATA (string);
}
// INLINE unsigned char
el.SREF = function SREF (/*Lisp_Object*/ string, /*ptrdiff_t*/ index)
{
  return el.SDATA (string)[index];
}
// INLINE void
el.SSET = function SSET (/*Lisp_Object*/ string, /*ptrdiff_t*/ index, /*unsigned*/ /*char*/ _new)
{
  el.SDATA (string)[index] = _new;
}
// INLINE ptrdiff_t
el.SCHARS = function SCHARS (/*Lisp_Object*/ string)
{
  return el.XSTRING (string).size;
}

// #ifdef GC_CHECK_STRING_BYTES
// extern ptrdiff_t string_bytes (struct Lisp_String *);
// #endif

// INLINE ptrdiff_t
el.STRING_BYTES = function STRING_BYTES (/* struct Lisp_String * */ s)
{
// #ifdef GC_CHECK_STRING_BYTES
//   return string_bytes (s);
// #else
  return (s.size_byte < 0) ? s.size : s.size_byte;
// #endif
}

// INLINE ptrdiff_t
el.SBYTES = function SBYTES (/*Lisp_Object*/ string)
{
  return el.STRING_BYTES (el.XSTRING (string));
}
// INLINE void
el.STRING_SET_CHARS = function STRING_SET_CHARS (/*Lisp_Object*/ string, /*ptrdiff_t*/ newsize)
{
  /* This function cannot change the size of data allocated for the
     string when it was created.  */
  el.eassert (() => el.STRING_MULTIBYTE (string)
	   ? newsize <= el.SBYTES (string)
	   : newsize == el.SCHARS (string));
  el.XSTRING (string).size = newsize;
}




/* A regular vector is just a header plus an array of Lisp_Objects.  */

// struct Lisp_Vector
//   {
//     struct vectorlike_header header;
//     Lisp_Object contents[FLEXIBLE_ARRAY_MEMBER];
//   };

// INLINE bool
el.VECTORLIKEP = function VECTORLIKEP (/*Lisp_Object*/ x)
{
  return el.lisp_h_VECTORLIKEP (x);
}

// INLINE struct Lisp_Vector *
el.XVECTOR = function XVECTOR (/*Lisp_Object*/ a)
{
  el.eassert (() => el.VECTORLIKEP (a));
  return el.deref(a);
}

// INLINE ptrdiff_t
el.ASIZE = function ASIZE (/*Lisp_Object*/ array)
{
  el.eassume (() => el.VECTORLIKEP(array));
  let /*ptrdiff_t*/ size = el.XVECTOR (array).header.size; //->header.size;
  el.eassume (() => 0 <= size);
  return size;
}

// INLINE ptrdiff_t
el.PVSIZE = function PVSIZE (/*Lisp_Object*/ pv)
{
  return el.ASIZE (pv) & el.PSEUDOVECTOR_SIZE_MASK;
}

// INLINE bool
el.VECTORP = function VECTORP (/*Lisp_Object*/ x)
{
  return el.VECTORLIKEP (x) && ! (el.ASIZE (x) & el.PSEUDOVECTOR_FLAG);
}

// INLINE void
el.CHECK_VECTOR = function CHECK_VECTOR (/*Lisp_Object*/ x)
{
  el.CHECK_TYPE (el.VECTORP (x), el.Qvectorp, x);
}


/* A pseudovector is like a vector, but has other non-Lisp components.  */

// INLINE enum pvec_type
el.PSEUDOVECTOR_TYPE = function PSEUDOVECTOR_TYPE (/* struct Lisp_Vector * */ v)
{
  let /*ptrdiff_t*/ size = v.header.size; //v->header.size;
  return (size & el.PSEUDOVECTOR_FLAG
          ? (size & el.PVEC_TYPE_MASK) >> el.PSEUDOVECTOR_AREA_BITS
          : el.PVEC_NORMAL_VECTOR);
}

/* Can't be used with PVEC_NORMAL_VECTOR.  */
// INLINE bool
el.PSEUDOVECTOR_TYPEP = function PSEUDOVECTOR_TYPEP (/* struct vectorlike_header * */ a, /*enum pvec_type*/ code)
{
  /* We don't use PSEUDOVECTOR_TYPE here so as to avoid a shift
   * operation when `code' is known.  */
  return ((/*a->size*/ a.size & (el.PSEUDOVECTOR_FLAG | el.PVEC_TYPE_MASK))
	  == (el.PSEUDOVECTOR_FLAG | (code << el.PSEUDOVECTOR_AREA_BITS)));
}

/* True if A is a pseudovector whose code is CODE.  */
// INLINE bool
el.PSEUDOVECTORP = function PSEUDOVECTORP (/*Lisp_Object*/ a, /*int*/ code)
{
  if (! el.VECTORLIKEP (a))
    return false;
  else
    {
      /* Converting to struct vectorlike_header * avoids aliasing issues.  */
      // /* struct vectorlike_header * */h = el.XUNTAG (a, el.Lisp_Vectorlike);
      /* struct vectorlike_header * */h = el.deref (a, el.Lisp_Vectorlike).header;
      return el.PSEUDOVECTOR_TYPEP (h, code);
    }
}





/***********************************************************************
		       Pure Storage Management
 ***********************************************************************/

/* Allocate room for SIZE bytes from pure Lisp storage and return a
   pointer to it.  TYPE is the Lisp type for which the memory is
   allocated.  TYPE < 0 means it's not used for a Lisp object.  */

// static void *
el.pure_alloc = function pure_alloc (/*size_t*/ size, /*int*/ type = -1)
{
  if (type < 0) {
    var buffer = new MutableBuffer(/* initialSize */ size, /* blockSize */ size / 4);
    return buffer;
  }
  let ptr = el.make_lisp_ptr(null, type);
  let obj = el.Lisp_Object(ptr);
  return obj;

  // void *result;

 // again:
  // if (type >= 0)
  //   {
  //     /* Allocate space for a Lisp object from the beginning of the free
	 // space with taking account of alignment.  */
  //     result = pointer_align (purebeg + pure_bytes_used_lisp, GCALIGNMENT);
  //     pure_bytes_used_lisp = ((char *)result - (char *)purebeg) + size;
  //   }
  // else
  //   {
  //     /* Allocate space for a non-Lisp object from the end of the free
	 // space.  */
  //     pure_bytes_used_non_lisp += size;
  //     result = purebeg + pure_size - pure_bytes_used_non_lisp;
  //   }
  // pure_bytes_used = pure_bytes_used_lisp + pure_bytes_used_non_lisp;

  // if (pure_bytes_used <= pure_size)
  //   return result;

  // /* Don't allocate a large amount here,
  //    because it might get mmap'd and then its address
  //    might not be usable.  */
  // purebeg = xmalloc (10000);
  // pure_size = 10000;
  // pure_bytes_used_before_overflow += pure_bytes_used - size;
  // pure_bytes_used = 0;
  // pure_bytes_used_lisp = pure_bytes_used_non_lisp = 0;
  // goto again;
}


// #ifndef CANNOT_DUMP

// /* Print a warning if PURESIZE is too small.  */

// void
// check_pure_size (void)
// {
//   if (pure_bytes_used_before_overflow)
//     message (("emacs:0:Pure Lisp storage overflow (approx. %"pI"d"
// 	      " bytes needed)"),
// 	     pure_bytes_used + pure_bytes_used_before_overflow);
// }
// #endif




/* Return a string allocated in pure space.  DATA is a buffer holding
   NCHARS characters, and NBYTES bytes of string data.  MULTIBYTE
   means make the result string multibyte.

   Must get an error if pure storage is full, since if it cannot hold
   a large string it may be able to hold conses that point to that
   string; then the string is not protected from gc.  */

// Lisp_Object
el.make_pure_string = function make_pure_string (/* const char **/ data,
		  /*ptrdiff_t*/ nchars, /*ptrdiff_t*/ nbytes, /*bool*/ multibyte)
{
  let /*Lisp_Object*/ string;
  let /* struct Lisp_String * */ s = el.pure_alloc (1, el.Lisp_String);
  s.data = /*(unsigned char *)*/ el.find_string_data_in_pure (data, nbytes);
  if (s.data == el.NULL)
    {
      s.data = el.pure_alloc (nbytes + 1, -1);
      el.memcpy (s.data, data, nbytes);
      s.data[nbytes] = '\0';
    }
  s.size = nchars;
  s.size_byte = multibyte ? nbytes : -1;
  s.intervals = el.NULL;
  el.XSETSTRING (string, s);
  return string;
}

/* Return a string allocated in pure space.  Do not
   allocate the string data, just point to DATA.  */

// Lisp_Object
el.make_pure_c_string = function make_pure_c_string (/* const char * */data, /*ptrdiff_t*/ nchars = data.length)
{
  let /* struct Lisp_String * */s = pure_alloc (1, el.Lisp_String);
  s.size = nchars;
  s.size_byte = -1;
  s.data = /*(unsigned char *)*/ data;
  s.intervals = el.NULL;
  return s;
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


  el_globals(el);

  require('./lread')(el);
  require('./data')(el);

  return el;

  }
}

function syms_of_alloc(el) {
  el.defsubr (el.Scons);
  el.defsubr (el.Slist);
  el.defsubr (el.Svector);
  el.defsubr (el.Srecord);
  el.defsubr (el.Sbool_vector);
  el.defsubr (el.Smake_byte_code);
  el.defsubr (el.Smake_list);
  el.defsubr (el.Smake_vector);
  el.defsubr (el.Smake_record);
  el.defsubr (el.Smake_string);
  el.defsubr (el.Smake_bool_vector);
  el.defsubr (el.Smake_symbol);
  el.defsubr (el.Smake_marker);
  el.defsubr (el.Smake_finalizer);
  el.defsubr (el.Spurecopy);
  el.defsubr (el.Sgarbage_collect);
  el.defsubr (el.Smemory_limit);
  el.defsubr (el.Smemory_info);
  el.defsubr (el.Smemory_use_counts);
  el.defsubr (el.Ssuspicious_object);
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

//   DEFUN2(function intern(name) {
//     return INTERN(name);
//   });

//   DEFUN2(function fboundp(name) {
//     return F.hasOwnProperty(name);
//   });

//   DEFUN2(function signal(name, data) {
//     let err = new Error(name);
//     err.data = data;
//     throw err;
//   });

//   DEFUN2(function symbol_function(name) {
//     if (!Ffboundp(name)) {
//     }
//   });


  
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
  el.eassume (() => false);
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
    console.log("")
    console.log("")
    console.log("")
    let name = el.defsym_name[el.deref(error_symbol).index]
  console.log(name)
  throw new Error(name);
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


/* Use these functions to set Lisp_Object
   or pointer slots of struct Lisp_Symbol.  */

// INLINE void
el.set_symbol_function = function set_symbol_function (/*Lisp_Object*/ sym, /*Lisp_Object*/ _function)
{
  el.XSYMBOL (sym).function = _function;
}

// INLINE void
el.set_symbol_plist = function set_symbol_plist (/*Lisp_Object*/ sym, /*Lisp_Object*/ plist)
{
  el.XSYMBOL (sym).plist = plist;
}

// INLINE void
el.set_symbol_next = function set_symbol_next (/*Lisp_Object*/ sym, /* struct Lisp_Symbol * */next)
{
  el.XSYMBOL (sym).next = next;
}

// INLINE void
el.make_symbol_constant = function make_symbol_constant (/*Lisp_Object*/ sym)
{
  el.XSYMBOL (sym).trapped_write = SYMBOL_NOWRITE;
}



// static void
el.set_symbol_name = function set_symbol_name (/*Lisp_Object*/ sym, /*Lisp_Object*/ name)
{
  el.XSYMBOL (sym).name = name;
}

// void
el.init_symbol = function init_symbol (/*Lisp_Object*/ sym, /*Lisp_Object*/ name)
{
  let str = el.deref(name);
  let /* struct Lisp_Symbol * */ p = el.XSYMBOL (sym);
  // prn(['init_symbol', str, p, el.SYMBOLP(p), el.XSYMBOL.toString()])
  el.set_symbol_name (sym, str);
  el.set_symbol_plist (sym, el.Qnil);
  p.redirect = el.SYMBOL_PLAINsym;
  el.SET_SYMBOL_VAL (p, el.Qunbound);
  el.set_symbol_function (sym, el.Qnil);
  el.set_symbol_next (sym, el.NULL);
  p.gcmarkbit = false;
  p.interned = el.SYMBOL_UNINTERNED;
  p.trapped_write = el.SYMBOL_UNTRAPPED_WRITE;
  p.declared_special = false;
  p.pinned = false;
}


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
  // let i = el.cons_cells_consed = el.cons_cells_consed || 0;
  val =  el.make_lisp_ptr(null, el.Lisp_Cons);

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
});


DEFUN ("make-vector", "Fmake_vector", "Smake_vector", 2, 2, 0,
    {doc: ` Return a newly created vector of length LENGTH, with each element being INIT.
See also the function \`vector'.  `},
  function (/*Lisp_Object*/ length, /*Lisp_Object*/ init)
{
  el.CHECK_NATNUM (length);
  let /*struct Lisp_Vector * */p = el.allocate_vector (el.XFASTINT (length));
  for (let /*ptrdiff_t*/ i = 0; i < el.XFASTINT (length); i++)
    // p->contents[i] = init;
    p.contents[i] = init;
  return el.make_lisp_ptr (p, el.Lisp_Vectorlike);
});

DEFUN ("vector", "Fvector", "Svector", 0, MANY, 0,
    {doc: ` Return a newly created vector with specified arguments as elements.
Any number of arguments, even zero arguments, are allowed.
usage: (vector &rest OBJECTS)  `},
  function Fveector (/*ptrdiff_t*/ nargs, /*Lisp_Object* */ args)
{
  /*Lisp_Object*/ val = el.make_uninit_vector (nargs);
  /* struct Lisp_Vector * */p = el.XVECTOR (val);
  // el.memcpy (p->contents, args, nargs * sizeof *args);
  el.memcpy (p.contents, args, nargs * el.len(args));
  return val;
})

el.init_obarray()
syms_of_alloc(el);
syms_of_data(el);
el.init_obarray();

}
