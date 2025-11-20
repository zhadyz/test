function ControlList({ controls, onControlSelect }) {
  if (!controls || controls.length === 0) {
    return null
  }

  return (
    <div className="control-list">
      <h3>Search Results ({controls.length} control{controls.length !== 1 ? 's' : ''} found)</h3>
      
      <div className="control-list-container">
        {controls.map((control) => (
          <div 
            key={control.control_id} 
            className="control-item"
            onClick={() => onControlSelect(control.control_id)}
          >
            <div className="control-header">
              <span className="control-id">{control.control_id}</span>
              <span className="control-name">{control.control_name}</span>
            </div>
            
            <div className="control-preview">
              <p className="control-explanation">
                {control.plain_english_explanation 
                  ? (control.plain_english_explanation.length > 150 
                     ? control.plain_english_explanation.substring(0, 150) + '...'
                     : control.plain_english_explanation)
                  : 'Click to view full details'
                }
              </p>
            </div>
            
            <div className="control-footer">
              <span className="click-hint">📖 Click to view full details →</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="results-info">
        <p>💡 Click on any control above to see full details including implementation examples and common misinterpretations.</p>
      </div>
    </div>
  )
}

export default ControlList 