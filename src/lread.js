
module.exports = function(el) {


// static Lisp_Object initial_obarray;
el.initial_obarray = el.lisp_obj(null, el.Lisp_Vectorlike);


/* `oblookup' stores the bucket number here, for the sake of Funintern.  */

// static size_t oblookup_last_bucket_number;
el.oblookup_last_bucket_number = 0;

/* Get an error if OBARRAY is not an obarray.
   If it is one, return it.  */

// Lisp_Object
el.check_obarray = function check_obarray (/*Lisp_Object*/ obarray)
{
  console.log(obarray);
  console.log(new Error().stack);
  process.exit();
  /* We don't want to signal a wrong-type-argument error when we are
     shutting down due to a fatal error, and we don't want to hit
     assertions in VECTORP and ASIZE if the fatal error was during GC.  */
  if (!el.fatal_error_in_progress
      && (!el.VECTORP (obarray) || el.ASIZE (obarray) == 0))
    {
      /* If Vobarray is now invalid, force it to be valid.  */
      if (el.EQ (el.Vobarray, obarray)) el.Vobarray = el.initial_obarray;
      el.wrong_type_argument (el.Qvectorp, obarray);
    }
  return obarray;
}

// /* Intern symbol SYM in OBARRAY using bucket INDEX.  */

// static Lisp_Object
// intern_sym (Lisp_Object sym, Lisp_Object obarray, Lisp_Object index)
// {
//   Lisp_Object *ptr;

//   XSYMBOL (sym)->interned = (EQ (obarray, initial_obarray)
// 			     ? SYMBOL_INTERNED_IN_INITIAL_OBARRAY
// 			     : SYMBOL_INTERNED);

//   if (SREF (SYMBOL_NAME (sym), 0) == ':' && EQ (obarray, initial_obarray))
//     {
//       make_symbol_constant (sym);
//       XSYMBOL (sym)->redirect = SYMBOL_PLAINVAL;
//       SET_SYMBOL_VAL (XSYMBOL (sym), sym);
//     }

//   ptr = aref_addr (obarray, XINT (index));
//   set_symbol_next (sym, SYMBOLP (*ptr) ? XSYMBOL (*ptr) : NULL);
//   *ptr = sym;
//   return sym;
// }

// /* Intern a symbol with name STRING in OBARRAY using bucket INDEX.  */

// Lisp_Object
el.intern_driver = function intern_driver (/*Lisp_Object*/ string, /*Lisp_Object*/ obarray, /*Lisp_Object*/ index)
{
  return intern_sym (Fmake_symbol (string), obarray, index);
}

// /* Intern the C string STR: return a symbol with that name,
//    interned in the current obarray.  */

// Lisp_Object
el.intern_1 = function intern_1 (/* const char * */str, /*ptrdiff_t*/ len)
{
  /*Lisp_Object*/ obarray = el.check_obarray (el.Vobarray);
  /*Lisp_Object*/ tem = el.oblookup (obarray, str, len, len);

  return (el.SYMBOLP (tem) ? tem
	  /* The above `oblookup' was done on the basis of nchars==nbytes, so
	     the string has to be unibyte.  */
	  : el.intern_driver (el.make_unibyte_string (str, len),
			   obarray, tem));
}

// Lisp_Object
el.intern_c_string_1 = function intern_c_string_1 (/* const char * */str, /*ptrdiff_t*/ len)
{
  let /*Lisp_Object*/ obarray = el.check_obarray (el.Vobarray);
  let /*Lisp_Object*/ tem = el.oblookup (obarray, str, len, len);

  if (!el.SYMBOLP (tem))
    {
      /* Creating a non-pure string from a string literal not implemented yet.
	 We could just use make_string here and live with the extra copy.  */
      el.eassert (() => !el.NILP (el.Vpurify_flag));
      tem = el.intern_driver (el.make_pure_c_string (str, len), obarray, tem);
    }
  return tem;
}

el.strlen = function strlen (x) {
  return x.length;
}

// static void
el.define_symbol = function define_symbol (/*Lisp_Object*/ sym, /* char const * */ str)
{
  console.log(['define_symbol', el.deref(sym), str]);
  let /*ptrdiff_t*/ len = el.strlen (str);
  /*Lisp_Object*/ string = el.make_pure_c_string (str, len);
  el.init_symbol (sym, string);

  /* Qunbound is uninterned, so that it's not confused with any symbol
     'unbound' created by a Lisp program.  */
  if (! el.EQ (sym, el.Qunbound))
    {
      // let /*Lisp_Object*/ bucket = el.oblookup (el.initial_obarray, str, len, len);
      // el.eassert (() => el.INTEGERP (bucket));
      // el.intern_sym (sym, el.initial_obarray, bucket);
    }
}
// 
// DEFUN ("intern", Fintern, Sintern, 1, 2, 0,
//        doc: /* Return the canonical symbol whose name is STRING.
// If there is none, one is created by this function and returned.
// A second optional argument specifies the obarray to use;
// it defaults to the value of `obarray'.  */)
//   (Lisp_Object string, Lisp_Object obarray)
// {
//   Lisp_Object tem;

//   obarray = check_obarray (NILP (obarray) ? Vobarray : obarray);
//   CHECK_STRING (string);

//   tem = oblookup (obarray, SSDATA (string), SCHARS (string), SBYTES (string));
//   if (!SYMBOLP (tem))
//     tem = intern_driver (NILP (Vpurify_flag) ? string : Fpurecopy (string),
// 			 obarray, tem);
//   return tem;
// }

// DEFUN ("intern-soft", Fintern_soft, Sintern_soft, 1, 2, 0,
//        doc: /* Return the canonical symbol named NAME, or nil if none exists.
// NAME may be a string or a symbol.  If it is a symbol, that exact
// symbol is searched for.
// A second optional argument specifies the obarray to use;
// it defaults to the value of `obarray'.  */)
//   (Lisp_Object name, Lisp_Object obarray)
// {
//   register Lisp_Object tem, string;

//   if (NILP (obarray)) obarray = Vobarray;
//   obarray = check_obarray (obarray);

//   if (!SYMBOLP (name))
//     {
//       CHECK_STRING (name);
//       string = name;
//     }
//   else
//     string = SYMBOL_NAME (name);

//   tem = oblookup (obarray, SSDATA (string), SCHARS (string), SBYTES (string));
//   if (INTEGERP (tem) || (SYMBOLP (name) && !EQ (name, tem)))
//     return Qnil;
//   else
//     return tem;
// }
// 
// DEFUN ("unintern", Funintern, Sunintern, 1, 2, 0,
//        doc: /* Delete the symbol named NAME, if any, from OBARRAY.
// The value is t if a symbol was found and deleted, nil otherwise.
// NAME may be a string or a symbol.  If it is a symbol, that symbol
// is deleted, if it belongs to OBARRAY--no other symbol is deleted.
// OBARRAY, if nil, defaults to the value of the variable `obarray'.
// usage: (unintern NAME OBARRAY)  */)
//   (Lisp_Object name, Lisp_Object obarray)
// {
//   register Lisp_Object string, tem;
//   size_t hash;

//   if (NILP (obarray)) obarray = Vobarray;
//   obarray = check_obarray (obarray);

//   if (SYMBOLP (name))
//     string = SYMBOL_NAME (name);
//   else
//     {
//       CHECK_STRING (name);
//       string = name;
//     }

//   tem = oblookup (obarray, SSDATA (string),
// 		  SCHARS (string),
// 		  SBYTES (string));
//   if (INTEGERP (tem))
//     return Qnil;
//   /* If arg was a symbol, don't delete anything but that symbol itself.  */
//   if (SYMBOLP (name) && !EQ (name, tem))
//     return Qnil;

//   /* There are plenty of other symbols which will screw up the Emacs
//      session if we unintern them, as well as even more ways to use
//      `setq' or `fset' or whatnot to make the Emacs session
//      unusable.  Let's not go down this silly road.  --Stef  */
//   /* if (EQ (tem, Qnil) || EQ (tem, Qt))
//        error ("Attempt to unintern t or nil"); */

//   XSYMBOL (tem)->interned = SYMBOL_UNINTERNED;

//   hash = oblookup_last_bucket_number;

//   if (EQ (AREF (obarray, hash), tem))
//     {
//       if (XSYMBOL (tem)->next)
// 	{
// 	  Lisp_Object sym;
// 	  XSETSYMBOL (sym, XSYMBOL (tem)->next);
// 	  ASET (obarray, hash, sym);
// 	}
//       else
// 	ASET (obarray, hash, make_number (0));
//     }
//   else
//     {
//       Lisp_Object tail, following;

//       for (tail = AREF (obarray, hash);
// 	   XSYMBOL (tail)->next;
// 	   tail = following)
// 	{
// 	  XSETSYMBOL (following, XSYMBOL (tail)->next);
// 	  if (EQ (following, tem))
// 	    {
// 	      set_symbol_next (tail, XSYMBOL (following)->next);
// 	      break;
// 	    }
// 	}
//     }

//   return Qt;
// }
// 
// /* Return the symbol in OBARRAY whose names matches the string
//    of SIZE characters (SIZE_BYTE bytes) at PTR.
//    If there is no such symbol, return the integer bucket number of
//    where the symbol would be if it were present.

//    Also store the bucket number in oblookup_last_bucket_number.  */

// Lisp_Object
// oblookup (Lisp_Object obarray, register const char *ptr, ptrdiff_t size, ptrdiff_t size_byte)
// {
//   size_t hash;
//   size_t obsize;
//   register Lisp_Object tail;
//   Lisp_Object bucket, tem;

//   obarray = check_obarray (obarray);
//   /* This is sometimes needed in the middle of GC.  */
//   obsize = gc_asize (obarray);
//   hash = hash_string (ptr, size_byte) % obsize;
//   bucket = AREF (obarray, hash);
//   oblookup_last_bucket_number = hash;
//   if (EQ (bucket, make_number (0)))
//     ;
//   else if (!SYMBOLP (bucket))
//     error ("Bad data in guts of obarray"); /* Like CADR error message.  */
//   else
//     for (tail = bucket; ; XSETSYMBOL (tail, XSYMBOL (tail)->next))
//       {
// 	if (SBYTES (SYMBOL_NAME (tail)) == size_byte
// 	    && SCHARS (SYMBOL_NAME (tail)) == size
// 	    && !memcmp (SDATA (SYMBOL_NAME (tail)), ptr, size_byte))
// 	  return tail;
// 	else if (XSYMBOL (tail)->next == 0)
// 	  break;
//       }
//   XSETINT (tem, hash);
//   return tem;
// }
// 
// void
// map_obarray (Lisp_Object obarray, void (*fn) (Lisp_Object, Lisp_Object), Lisp_Object arg)
// {
//   ptrdiff_t i;
//   register Lisp_Object tail;
//   CHECK_VECTOR (obarray);
//   for (i = ASIZE (obarray) - 1; i >= 0; i--)
//     {
//       tail = AREF (obarray, i);
//       if (SYMBOLP (tail))
// 	while (1)
// 	  {
// 	    (*fn) (tail, arg);
// 	    if (XSYMBOL (tail)->next == 0)
// 	      break;
// 	    XSETSYMBOL (tail, XSYMBOL (tail)->next);
// 	  }
//     }
// }

// static void
// mapatoms_1 (Lisp_Object sym, Lisp_Object function)
// {
//   call1 (function, sym);
// }

// DEFUN ("mapatoms", Fmapatoms, Smapatoms, 1, 2, 0,
//        doc: /* Call FUNCTION on every symbol in OBARRAY.
// OBARRAY defaults to the value of `obarray'.  */)
//   (Lisp_Object function, Lisp_Object obarray)
// {
//   if (NILP (obarray)) obarray = Vobarray;
//   obarray = check_obarray (obarray);

//   map_obarray (obarray, mapatoms_1, function);
//   return Qnil;
// }

  el.ARRAYELTS = function ARRAYELTS(l) {
    return l.length;
  }

el.OBARRAY_SIZE = 15121

// void
el.init_obarray = function init_obarray (/*void*/)
{
  el.Vobarray = el.Fmake_vector (el.make_number (el.OBARRAY_SIZE), el.make_number (0));
  el.initial_obarray = el.Vobarray;
  // el.staticpro (el.initial_obarray);

  for (let i = 0; i < el.ARRAYELTS (el.lispsym); i++) {
    console.log(i, el.builtin_lisp_symbol (i), el.defsym_name[i]);
    el.define_symbol (el.builtin_lisp_symbol (i), el.defsym_name[i]);
  }

  el.DEFSYM (el.Qunbound, "unbound");

  el.DEFSYM (el.Qnil, "nil");
  el.SET_SYMBOL_VAL (el.XSYMBOL (el.Qnil), el.Qnil);
  el.make_symbol_constant (el.Qnil);
  el.XSYMBOL (el.Qnil).declared_special = true;

  el.DEFSYM (el.Qt, "t");
  el.SET_SYMBOL_VAL (el.XSYMBOL (el.Qt), el.Qt);
  el.make_symbol_constant (el.Qt);
  el.XSYMBOL (el.Qt).declared_special = true;

  /* Qt is correct even if CANNOT_DUMP.  loadup.el will set to nil at end.  */
  el.Vpurify_flag = el.Qt;

  el.DEFSYM (el.Qvariable_documentation, "variable-documentation");
}


}
