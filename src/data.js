
module.exports = function(el) {

el.DEFUN ("subr-arity", "Fsubr_arity", "Ssubr_arity", 1, 1, 0,
    {doc: ` Return minimum and maximum number of args allowed for SUBR.
SUBR must be a built-in function.
The returned value is a pair (MIN . MAX).  MIN is the minimum number
of args.  MAX is the maximum number or the symbol \`many', for a
function with \`&rest' args, or \`unevalled' for a special form.  `},
  function Fsubr_arity (/*Lisp_Object*/ subr)
{
  let /*short*/ minargs, maxargs;
  el.CHECK_SUBR (subr);
  minargs = el.XSUBR (subr).min_args;
  maxargs = el.XSUBR (subr).max_args;
  return el.Fcons (el.make_number (minargs),
		maxargs == el.MANY ?        el.Qmany
		: maxargs == el.UNEVALLED ? el.Qunevalled
		:                        el.make_number (maxargs));
});

}
