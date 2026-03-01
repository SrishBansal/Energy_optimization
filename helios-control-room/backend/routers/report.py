"""routers/report.py — Excel Export endpoint"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from engines.report_engine import generate_excel_report

router = APIRouter()

@router.get("/api/report/export")
def export_report():
    """
    Generates and returns a multi-sheet Excel report for Project HELIOS.
    """
@router.get("/api/report/appendix")
def export_appendix(state: str = None):
    """
    Generates and returns a CSV 'Technical Appendix' for Project HELIOS.
    """
    try:
        file_obj = generate_excel_report() # Keep existing
        # This endpoint is specifically for CSV
        from engines.report_engine import generate_appendix_csv
        csv_file = generate_appendix_csv(state)
        headers = {
            'Content-Disposition': f'attachment; filename="HELIOS_Technical_Appendix_{state if state else "System"}.csv"'
        }
        return StreamingResponse(
            csv_file,
            headers=headers,
            media_type="text/csv"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Appendix generation failed: {e}")
