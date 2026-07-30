import re
import sys

def main():
    try:
        with open('frontend/src/app/public/invoice/[token]/page.tsx', 'r', encoding='utf-8') as f:
            invoice_content = f.read()

        with open('frontend/src/app/public/quote/[token]/page.tsx', 'r', encoding='utf-8') as f:
            quote_content = f.read()
            
        # Extract the UI from Invoice: from <div className="invoice-container..." to the end of the E-Signature Section
        # We'll use regex to grab everything from <div className="invoice-container to the end of <div className="... E-Signature Section ... </div>
        # Actually, simpler: grab from 'return (' to just before '{/* Payment Section */}'
        m_inv = re.search(r'(    <>\s*<style dangerouslySetInnerHTML=\{{ __html: `.*?)(?=\s*\{\/\* Payment Section \*\/\})', invoice_content, re.DOTALL)
        if not m_inv:
            print("Could not find invoice UI block")
            return
            
        inv_ui = m_inv.group(1)
        
        # Replace variable names in inv_ui
        q_ui = inv_ui.replace('invoice-container', 'quote-container')
        q_ui = q_ui.replace('invoice.invoice_number', 'quote.quote_number')
        q_ui = q_ui.replace('invoice.issue_date', 'quote.created_at.split("T")[0]') # Use created_at or something
        q_ui = q_ui.replace('invoice.due_date', 'quote.valid_until') # Assume valid_until
        q_ui = q_ui.replace('invoice.', 'quote.')
        q_ui = q_ui.replace('InvoiceLineItem', 'any')
        q_ui = q_ui.replace('INVOICE DOCUMENT', 'QUOTE DOCUMENT')
        q_ui = q_ui.replace('INVOICE', 'QUOTE')
        q_ui = q_ui.replace('Invoice', 'Quote')
        q_ui = q_ui.replace('invoice,', 'quote,')
        q_ui = q_ui.replace('invoice)', 'quote)')
        
        # Now find the place in quote_content to replace
        # We will replace from '    <>\s*<style dangerouslySetInnerHTML=\{{ __html: `' to the end of the signature section (or right before Mobile Action Panel if any)
        # Actually, let's just grab the whole return block in Quote and replace it.
        # The quote signature block is basically what we need at the end.
        m_quote_return = re.search(r'(  return \(\s*)(.*?)(\s*<\/div>\s*<\/div>\s*<\/>\s*\);\s*\})', quote_content, re.DOTALL)
        if not m_quote_return:
            print("Could not find quote return block")
            return
            
        # What we want: return ( {q_ui} </div></div></>);
        # Wait, the signature section in q_ui has "Quote Acknowledged" because we replaced "Invoice".
        # Let's fix some specific text in q_ui's signature section
        q_ui = q_ui.replace('Quote Acknowledged', 'Quote Accepted')
        q_ui = q_ui.replace('acknowledge receipt of this quote.', 'acknowledge and accept this quote.')
        
        # Let's inject q_ui into the quote_content
        new_quote_content = quote_content[:m_quote_return.start(2)] + q_ui + "\n      </div>\n    </div>\n    </>\n  );\n}"
        
        # Let's fix the top level variables in quote_content
        # quote uses `quoteSettings` instead of `invoice.settings`? 
        # Actually, if we look at `quote_content` from earlier, `quote` might not have `.settings`.
        # It used `const settings = (quote as any).settings || (quote.company as any)?.invoice_settings || {};`
        # Let's inject that logic if not present, but wait, `q_ui` uses `quote.settings`. 
        # We should just ensure `quote.settings` is defined or we replace `quote.settings` with `settings`.
        q_ui = q_ui.replace('quote.settings?', 'settings?')
        q_ui = q_ui.replace('quote.settings.', 'settings.')
        
        # Re-build new quote content
        new_quote_content = quote_content[:m_quote_return.start(2)] + q_ui + "\n      </div>\n    </div>\n    </>\n  );\n}"
        
        with open('frontend/src/app/public/quote/[token]/page.tsx', 'w', encoding='utf-8') as f:
            f.write(new_quote_content)
        
        print("Successfully updated quote UI!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    main()
