import re
import math
from typing import List, Dict, Any, Tuple
import pypdf
import docx

class DocumentExtractor:
    @staticmethod
    def extract_from_pdf(file_obj) -> Tuple[str, List[Dict[str, Any]], int]:
        """
        Extracts text from PDF file object.
        Returns: (full_text, pages_data, page_count)
        pages_data: [{'page': 1, 'text': '...'}]
        """
        reader = pypdf.PdfReader(file_obj)
        pages_data = []
        full_text_parts = []
        page_count = len(reader.pages)

        for idx, page in enumerate(reader.pages):
            page_num = idx + 1
            text = page.extract_text() or ""
            text = text.strip()
            if text:
                pages_data.append({
                    'page': page_num,
                    'text': text
                })
                full_text_parts.append(f"[Page {page_num}]\n{text}")

        total_text = "\n\n".join(full_text_parts).strip()
        if not total_text:
            raise ValueError("No extractable text found in the PDF. The document may be image-only or scanned.")

        return total_text, pages_data, page_count

    @staticmethod
    def extract_from_docx(file_obj) -> Tuple[str, List[Dict[str, Any]], int]:
        """
        Extracts text and tables from DOCX file object in document order.
        """
        from docx.oxml.text.paragraph import CT_P
        from docx.oxml.table import CT_Tbl
        from docx.text.paragraph import Paragraph
        from docx.table import Table

        doc = docx.Document(file_obj)
        full_text_parts = []
        pages_data = []

        current_heading = ""
        current_section = []
        section_idx = 1

        for child in doc.element.body:
            if isinstance(child, CT_P):
                para = Paragraph(child, doc)
                text = para.text.strip()
                if not text:
                    continue
                # Detect heading by style name or numbered heading
                is_heading = (
                    para.style.name.lower().startswith('heading') or
                    para.style.name.lower().startswith('title') or
                    bool(re.match(r'^[0-9]+(\.[0-9]+)*\s+[A-Z]', text))
                )
                if is_heading:
                    if current_section:
                        sec_text = "\n".join(current_section)
                        pages_data.append({
                            'page': section_idx,
                            'heading': current_heading or f"Section {section_idx}",
                            'text': sec_text
                        })
                        full_text_parts.append(f"[{current_heading or f'Section {section_idx}'}]\n{sec_text}")
                        section_idx += 1
                        current_section = []
                    current_heading = text
                else:
                    current_section.append(text)

            elif isinstance(child, CT_Tbl):
                tbl = Table(child, doc)
                table_lines = []
                for row_idx, row in enumerate(tbl.rows):
                    row_cells = [cell.text.strip().replace('\n', ' ') for cell in row.cells]
                    # Filter out duplicate merged cells
                    cleaned_cells = []
                    for c in row_cells:
                        if not cleaned_cells or c != cleaned_cells[-1]:
                            cleaned_cells.append(c)
                    table_lines.append("| " + " | ".join(cleaned_cells) + " |")
                    if row_idx == 0:
                        table_lines.append("| " + " | ".join(["---"] * len(cleaned_cells)) + " |")
                if table_lines:
                    current_section.append("\n" + "\n".join(table_lines) + "\n")

        if current_section:
            sec_text = "\n".join(current_section)
            pages_data.append({
                'page': section_idx,
                'heading': current_heading or f"Section {section_idx}",
                'text': sec_text
            })
            full_text_parts.append(f"[{current_heading or f'Section {section_idx}'}]\n{sec_text}")

        total_text = "\n\n".join(full_text_parts).strip()
        if not total_text:
            raise ValueError("No text found in the DOCX document.")

        return total_text, pages_data, max(1, len(pages_data))

    @staticmethod
    def extract_from_txt(file_obj_or_str) -> Tuple[str, List[Dict[str, Any]], int]:
        """
        Extracts text from plain text.
        """
        if hasattr(file_obj_or_str, 'read'):
            raw = file_obj_or_str.read()
            if isinstance(raw, bytes):
                try:
                    text = raw.decode('utf-8')
                except UnicodeDecodeError:
                    text = raw.decode('latin-1', errors='ignore')
            else:
                text = str(raw)
        else:
            text = str(file_obj_or_str)

        text = text.strip()
        if not text:
            raise ValueError("The provided text is empty.")

        # Estimate pages (~3000 chars per page)
        page_count = max(1, math.ceil(len(text) / 3000))
        pages_data = []
        chunk_sz = max(1000, len(text) // page_count)
        for i in range(page_count):
            start = i * chunk_sz
            end = min(len(text), (i + 1) * chunk_sz)
            pages_data.append({
                'page': i + 1,
                'text': text[start:end]
            })

        return text, pages_data, page_count


class DocumentChunker:
    @staticmethod
    def chunk_document(
        pages_data: List[Dict[str, Any]],
        chunk_size: int = 800,
        chunk_overlap: int = 150
    ) -> List[Dict[str, Any]]:
        """
        Splits pages_data into overlapping chunks with metadata.
        Each chunk has:
          chunk_index: int
          page_number: int
          heading: str
          content: str
          token_count: int
        """
        chunks = []
        chunk_index = 0

        for p_item in pages_data:
            page_num = p_item.get('page', 1)
            heading = p_item.get('heading', '')
            text = p_item.get('text', '').strip()

            if not text:
                continue

            # If page is small, it can be its own chunk
            if len(text) <= chunk_size:
                chunks.append({
                    'chunk_index': chunk_index,
                    'page_number': page_num,
                    'heading': heading,
                    'content': text,
                    'token_count': len(text.split())
                })
                chunk_index += 1
                continue

            # Otherwise, create overlapping sub-chunks for the page
            start = 0
            while start < len(text):
                end = min(start + chunk_size, len(text))
                # Try not to break words
                if end < len(text):
                    last_space = text.rfind(' ', start, end)
                    if last_space > start + (chunk_size // 2):
                        end = last_space

                chunk_text = text[start:end].strip()
                if chunk_text:
                    chunks.append({
                        'chunk_index': chunk_index,
                        'page_number': page_num,
                        'heading': heading,
                        'content': chunk_text,
                        'token_count': len(chunk_text.split())
                    })
                    chunk_index += 1

                if end >= len(text):
                    break
                start = max(start + 1, end - chunk_overlap)

        return chunks


class BM25Retriever:
    """
    Lightweight, fast BM25 (Best Matching 25) implementation
    for local vector/keyword retrieval of document chunks.
    """
    def __init__(self, chunks: List[Dict[str, Any]], k1: float = 1.5, b: float = 0.75):
        self.chunks = chunks
        self.k1 = k1
        self.b = b
        self.doc_count = len(chunks)
        self.doc_lengths = []
        self.avg_doc_length = 0.0
        self.inverted_index = {}  # term -> list of (doc_idx, freq)
        self.idf = {}
        self._build_index()

    def _tokenize(self, text: str) -> List[str]:
        # Lowercase, extract alphanumeric words of len >= 2
        return [w.lower() for w in re.findall(r'[a-zA-Z0-9_\-\.\%]+', text) if len(w) >= 2]

    def _build_index(self):
        if not self.chunks:
            return

        total_len = 0
        df = {}

        for doc_idx, chunk in enumerate(self.chunks):
            tokens = self._tokenize(chunk['content'])
            doc_len = len(tokens)
            self.doc_lengths.append(doc_len)
            total_len += doc_len

            term_freq = {}
            for t in tokens:
                term_freq[t] = term_freq.get(t, 0) + 1

            for t, freq in term_freq.items():
                if t not in self.inverted_index:
                    self.inverted_index[t] = []
                self.inverted_index[t].append((doc_idx, freq))
                df[t] = df.get(t, 0) + 1

        self.avg_doc_length = (total_len / self.doc_count) if self.doc_count > 0 else 1.0

        for t, freq in df.items():
            # BM25 IDF formulation
            self.idf[t] = math.log(1 + (self.doc_count - freq + 0.5) / (freq + 0.5))

    def retrieve(self, query: str, top_k: int = 5) -> List[Tuple[Dict[str, Any], float]]:
        """
        Retrieves top_k chunks matching query with BM25 score.
        """
        if not self.chunks:
            return []

        query_tokens = self._tokenize(query)
        if not query_tokens:
            return [(c, 1.0) for c in self.chunks[:top_k]]

        scores = [0.0] * self.doc_count

        for qt in query_tokens:
            if qt not in self.inverted_index:
                continue
            idf_val = self.idf.get(qt, 0.0)
            for doc_idx, freq in self.inverted_index[qt]:
                doc_len = self.doc_lengths[doc_idx]
                numerator = freq * (self.k1 + 1)
                denominator = freq + self.k1 * (1 - self.b + self.b * (doc_len / (self.avg_doc_length or 1.0)))
                score = idf_val * (numerator / denominator)
                scores[doc_idx] += score

                # Boost if page/section heading or title contains query token
                heading = self.chunks[doc_idx].get('heading', '').lower()
                if qt in heading:
                    scores[doc_idx] += idf_val * 0.5

        # Also give query phrase matching boost
        norm_query = query.lower().strip()
        for doc_idx, chunk in enumerate(self.chunks):
            chunk_lower = chunk['content'].lower()
            if norm_query in chunk_lower:
                scores[doc_idx] += 3.0

        # Pair chunks with scores
        scored_chunks = [(self.chunks[i], scores[i]) for i in range(self.doc_count)]
        # Sort descending
        scored_chunks.sort(key=lambda x: x[1], reverse=True)

        return scored_chunks[:top_k]
