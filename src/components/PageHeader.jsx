import React from 'react'

const PageHeader = ({ eyebrow, title, description, actions }) => {
  return (
    <div className="page-header-card">
      <div className="page-header-copy">
        {eyebrow ? <div className="page-header-eyebrow">{eyebrow}</div> : null}
        <h1 className="page-header-title">{title}</h1>
        {description ? <p className="page-header-description">{description}</p> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </div>
  )
}

export default PageHeader
