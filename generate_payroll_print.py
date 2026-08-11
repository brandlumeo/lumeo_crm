import re

with open('invoice_temp.txt', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace Imports
code = code.replace('import { usePublicInvoice, useSignPublicInvoice, usePayPublicInvoice, useVerifyPublicInvoicePayment } from "@/lib/queries";', 'import { usePayroll, useCurrentCompany, useInvoiceSettings } from "@/lib/queries";')
code = code.replace('import { InvoiceLineItem } from "@/lib/types";', '')
code = code.replace('import SignatureCanvas from "react-signature-canvas";', '')

# Remove Razorpay
code = re.sub(r'function loadRazorpayScript\(\).*?\}\n', '', code, flags=re.DOTALL)

# Replace Function signature
code = code.replace('export default function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {', 'export default function PayrollPrintPage({ params }: { params: Promise<{ id: string }> }) {')
code = code.replace('const token = resolvedParams.token;', 'const id = resolvedParams.id;')

# Replace queries
code = code.replace('const { data: invoice, isLoading, error } = usePublicInvoice(token);', '''
  const { data: slip, isLoading, error } = usePayroll(id);
  const { data: company } = useCurrentCompany();
  const { data: invoiceSettings } = useInvoiceSettings();
''')

# Remove mutations and unneeded states
code = re.sub(r'const signMutation = .*?useVerifyPublicInvoicePayment\(\);\n', '', code, flags=re.DOTALL)
code = code.replace('const [signedByName, setSignedByName] = useState("");', '')
code = code.replace('const sigCanvas = useRef<SignatureCanvas>(null);', '')
code = re.sub(r'const handleClearSignature = .*?(?=if \(isLoading\))', '', code, flags=re.DOTALL)

# Error states
code = code.replace('!invoice', '!slip || !company || !invoiceSettings')

# Replace print useEffect
code = code.replace('if (shouldPrint && invoice && !isLoading) {', 'if (shouldPrint && slip && company && invoiceSettings && !isLoading) {')
code = code.replace('if (invoice) {', 'if (slip) {')
code = code.replace('invoice.invoice_number', '`Salary Slip - ${slip.employee_name}`')
code = code.replace('invoice?.settings', 'invoiceSettings')
code = code.replace('invoice.settings', 'invoiceSettings')
code = code.replace('invoice.company', 'company')
code = code.replace('invoice.customer_details?.custom_data?.address', '""')
code = code.replace('invoice.customer_details?.email', 'slip.employee_email')
code = code.replace('invoice.customer_details?.phone', '""')
code = code.replace('invoice.issue_date', 'new Date().toLocaleDateString("en-US")')
code = code.replace('invoice.deal_details', 'null')
code = code.replace('invoice.customer_details?.name', 'slip.employee_name')
code = code.replace('invoice.customer_details', 'slip')
code = code.replace('invoice.payment_methods', '[]')
code = code.replace("typeof (slip as any)?.company_name === 'string'", 'false')


# Simple line-by-line filtering for problematic lines
lines = code.split('\n')
new_lines = []
skip = False
for line in lines:
    if 'invoice.due_date &&' in line:
        continue
    if 'invoiceSettings?.show_status_on_invoice' in line:
        continue
    if 'invoice.status' in line:
        continue
    if 'invoice.subtotal' in line:
        continue
    if 'invoice.tax_amount' in line:
        continue
    if 'invoice.total' in line:
        continue
    if 'invoice.amount_paid' in line:
        continue
    if 'invoice.amount_due' in line:
        continue
    if 'INVOICE' in line:
        line = line.replace('INVOICE', 'SALARY SLIP')
    new_lines.append(line)
code = '\n'.join(new_lines)


table_regex = re.compile(r'<div className="overflow-x-auto print:overflow-visible">.*?</table>\s*</div>', re.DOTALL)
summary_regex = re.compile(r'<div className="w-full max-w-sm print:max-w-none print:w-\[35%\] shrink-0 space-y-3 print:break-inside-avoid print:mt-0">.*?</div>\s*</div>', re.DOTALL)


table_html = '''<div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-left mb-8 print:mb-2 print:min-w-full">
                <thead>
                  <tr className="border-b border-line bg-bone/30" style={tpl === 'template1' ? { borderBottom: `2px solid ${accentColor}` } : {}}>
                    <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted" style={{ color: accentColor }}>Description</th>
                    <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted text-right whitespace-nowrap" style={{ color: accentColor }}>Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  <tr className={'bg-white'}>
                    <td className="py-4 px-4"><div className="font-semibold text-ink">Basic Salary</div></td>
                    <td className="py-4 px-4 text-right text-ink whitespace-nowrap">{formatCurrency(parseFloat(slip.basic_salary), company?.currency || 'INR')}</td>
                  </tr>
                  
                  {(typeof slip.earnings_breakdown === "string" ? JSON.parse(slip.earnings_breakdown) : slip.earnings_breakdown || []).map((item: any, i: number) => (
                    <tr key={`earn-${i}`} className={'bg-white'}>
                      <td className="py-4 px-4"><div className="font-semibold text-ink">{item.name}</div></td>
                      <td className="py-4 px-4 text-right text-emerald-600 whitespace-nowrap">+ {formatCurrency(parseFloat(item.amount), company?.currency || 'INR')}</td>
                    </tr>
                  ))}
                  
                  {(typeof slip.deductions_breakdown === "string" ? JSON.parse(slip.deductions_breakdown) : slip.deductions_breakdown || []).map((item: any, i: number) => (
                    <tr key={`deduct-${i}`} className={'bg-white'}>
                      <td className="py-4 px-4"><div className="font-semibold text-ink">{item.name}</div></td>
                      <td className="py-4 px-4 text-right text-rose-600 whitespace-nowrap">- {formatCurrency(parseFloat(item.amount), company?.currency || 'INR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>'''

summary_html = '''<div className="w-full max-w-sm print:max-w-none print:w-[35%] shrink-0 space-y-3 print:break-inside-avoid print:mt-0">
                <div className="flex justify-between text-muted">
                  <span>Basic Salary</span>
                  <span>{formatCurrency(parseFloat(slip.basic_salary), company?.currency || 'INR')}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-ink pt-4 border-t-2 border-line"
                     style={tpl === 'template3' ? { backgroundColor: accentColor, color: 'white', padding: '1rem', borderRadius: '0.5rem', marginTop: '1rem', border: 'none' } : {}}
                >
                  <span style={tpl === 'template3' ? { color: 'white' } : {}}>Net Pay</span>
                  <span style={tpl === 'template3' ? { color: 'white' } : {}}>{formatCurrency(parseFloat(slip.net_salary), company?.currency || 'INR')}</span>
                </div>
              </div>
            </div>'''

code = table_regex.sub(table_html, code)
code = summary_regex.sub(summary_html, code)

footer_start = code.find('<div className="mt-12 pt-8 print:mt-2')
if footer_start != -1:
    code = code[:footer_start] + '''<div className="mt-12 pt-8 print:mt-2 print:pt-2 border-t-2 border-line text-center flex flex-col items-center clear-both w-full" style={{ pageBreakBefore: 'auto' }}>
              <p className="text-muted text-sm">This is a computer-generated document and does not require a physical signature.</p>
              <p className="text-muted text-xs mt-2">Generated on {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
'''

with open('frontend/src/app/(app)/payroll/[id]/print/page.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
