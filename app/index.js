import React, {
    Component,
} from 'react'
import ReactDOM from 'react-dom'

class App extends Component {
    render() {
        return (
            <div style={{
                flex: 1,
                flexDirection: 'column',
            }}>
                <Like />
            </div>
        )
    }
}

class Like extends Component {
    constructor(props) {
        super(props)
    }

    render() {
        return (
            <div>
                <input type="number" maxLength="1" />
            </div>
        )
    }
}

ReactDOM.render(
    <App />,
    document.getElementById('root'),
)